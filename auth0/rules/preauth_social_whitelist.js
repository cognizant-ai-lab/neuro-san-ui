// preauth_social_whitelist.js
// Adapted by dfink ~ 6/28/2022.
// 
// Auth0 Rule that enables whitelisting and/or pre-authorization of Social users
// (i.e. GitHub, Facebook, etc.) for any Auth0 Application:
// 
//   * Whitelisting is done via the Authorization Extension Groups mechanism
//     (see Authorization > Groups in the Auth0 Dashboard).
//     
//   * Pre-authorization uses the same mechanism but requires that an
//     Auth0-managed User-Password user is created with the same email belonging
//     to the Social user's account and is added to the correct Authorization > Groups.
//
//     Note that without a pre-authorized User-Password user and this rule, there exists
//     a chicken-and-egg problem.  Auth0 UI flow would require a new Social user to attempt
//     to login to some App first and then explicitly *fail*.  This ends up necessitating
//     multiple manual exchanges with the user to let someone new in.
//     The initial Social user attempt is the only way to create such a user in the Auth0
//     system, and you can't whitelist a user using the Auth0 Dashboard UI without that
//     user existing first. (Though it is possible to whitelist emails in Rules code,
//     that approach is fraught with its own multiple perils.)
//     
//   * Ideally, periodic (manual as of 6/2022) maintenance on a required_group's Users
//     list should be done to both:
//       1. Add the actual Social user accounts to the Extension Group(s)
//       2. Purge the pre-authorized User-Pass user accounts from the same Extension Group(s)
//       3. Remove preauth User-Pass user accounts used only for whitelisting as well,
//          only if that is really necessary as an extra security precaution.
// 
// This rule uses a manually Auth0 Application Metadata required_groups field
// (see Applications > <App> > Settings > Advanced Settings > Application Metadata)
// to name the Authorization Extension Groups that any given App is interested in.
// Invoking the meat of this Rule is optional in that Apps that aren't interested in
// this kind of group membership/whitelisting just do not set the required_groups
// field in the Application Metadata and all is fine.
// 
// The implementation contains riffs on these sources:
//   1. https://auth0.com/docs/customize/extensions/authorization-extension/use-rules-with-the-authorization-extension#create-rule-enforcing-app-roles
//   2. The source for the auto-generated auth0-authorization-extension Rule.
//   
// Basic control flow goes like this:
//   1. Check to see that user object passed into rule has an email and that it's verified. Bounce if not.
//   2. The context.clientMetadata object is checked for the required_groups field.
//      If that is not there, or is empty, the App is not interested in the meat of this rule
//      and we let the user through this gate.
//   3. Check the user object against the Authorization Extension's addition of the groups field.
//      (The Authorization Extension Rule auth0-authorization-extension must be activated.)
//      If the groups on the user object match what is in the required_groups field, let the user through.
//   4. Asynchronously call the Auth0 Management API's getUsersByEmail method to collect
//      a list of users that have the same email as the user coming in.
//   5. When the async response comes back, compile a list of those users that might be
//      pre-authorizeable on the whitelist. As of 6/2022 these are only users that originate
//      from Auth0 (User-Password users).
//   6. Asynchronously call the Authorization Extension API for one of users that make the cut in 5
//      and shorten the list of the remaining users to test.
//   7. When that async response comes back, do similar checks as 1 and 3 above on
//      email verification and required_groups. If those pass, let the user in.
//   8. Continue to take users off the filtered list and repeat 6-8 with those users giving each a chance.
//   9. If the filtered list of users is exhausted with nothing going through, then bounce the
//      incoming user.

function userWhitelistForRequiredGroupsWithPreAuthorizedEmailChecks(user, context, callback) {
  
  // Spits out debugging to the console when true.
  var verbose = false;
  
  // Base address of the Auth0 Management API for your tenant.
  // This should be kept secret. Do not check the value in.
  var EXTENSION_URL = "This needs to come from your own auth-authorization-extension Rule line 7.";
  
  // Access should only be granted to verified users.
  if (!user.email) {
    return callback(new UnauthorizedError('Access denied. No user email.'));
  }
  
  if (!user.email_verified) {
    return callback(new UnauthorizedError('Access denied. User email not verified.'));
  }
  
  // Example riffed on from:
  // https://auth0.com/docs/customize/extensions/authorization-extension/use-rules-with-the-authorization-extension#create-rule-enforcing-app-roles
  // Start by creating an empty clientMetadata if none exists.
  context.clientMetadata = context.clientMetadata || {};
  
  // See if the required_groups is on the metadata.
  // We added this as an Application Metadata key by going to:
  // Auth0 Dashboard > Applications > [our app] > Settings > Advanced Settings > Application Metadata
  // ... and by specifically adding the groups we are interested in for the app as the
  // comma-separated value for the "required_groups" key.
  // Groups themselves are administered in:
  // Auth0 Dashboard > Authorization > Groups
  
  if (typeof context.clientMetadata.required_groups === 'undefined') {
    // We fall through to here if there was no required_groups in the metadata
    // which is an opt-in per-application configuration.
    // Return early for better performance for non-whitelisting apps.
    if (verbose) {
      console.log("No required groups. Letting though.");
    }
    return callback(null, user, context);
  } 
  
  if (context.clientMetadata.required_groups.length === null) {
    // We fall through to here if there was no required_groups in the metadata
    // which is an opt-in per-application configuration.
    // Return early for better performance for non-whitelisting apps.
    if (verbose) {
      console.log("0 required groups. Letting through");
    }
    return callback(null, user, context);
  }
  
  // lodash is a Javascript library to allow functional constructs like filtering.
  // This is used in multiple functions below.
  // Load it now, once, cuz now we know we will need it.
  var lodash = require('lodash');
  
  function isUserInRequiredGroups(user, context) {
    // If there are required_groups in the metadata ...
    // ... and if the user belongs to some group we defined ...
    // then return true. False otherwise.
    if (user.groups) {

      var groups = context.clientMetadata.required_groups.split(',');
      var matchingGroups = lodash.filter(user.groups, function(groupName) {
        return lodash.includes(groups, groupName);
      });
      
      if (matchingGroups && matchingGroups.length) {
        // User was in one of the groups we wanted.
        
        // Let them in only if the user's email is verified.
        // It might look like we did this check already,
        // but this function is used in more than one place within this rule.
        if (user.email && user.email_verified) {
           return true;
        }
      }
    }
    return false;
  }
  
  // If the user was in one of the required groups we wanted, let them in.
  var user_in_group = isUserInRequiredGroups(user, context);
  if (user_in_group) {
    // Return early for better performance for normal case in whitelisting apps.
    if (verbose) {
      console.log("User in required group. Letting through.");
    }
    return callback(null, user, context);
  }
  
  async function getUsersByEmail(user_email) {
    if (verbose) {
      console.log("in function with email " + user_email);
    }
    
    // Call the Auth0 Management Client to get information about
    // users with similar emails.
    var ManagementClient = require('auth0@2.9.1').ManagementClient;
    var management = new ManagementClient({
      token: auth0.accessToken,
      domain: auth0.domain
    });

    const promise = management.getUsersByEmail(user_email);
    return promise;
  }  // end getUsersByEmail()

  // Invoke the asyncrhonous function
  getUsersByEmail(user.email)
    .then(processUsersByEmail)       // ... when asyncrhonous results come back
    .catch((err) => callback(err));  // ... when an error happens.
  // Nothing else of substance should happen after this as the async stuff
  // takes over. Function definitions are OK, of course.
  
  function processUsersByEmail(test_users) {
    // Function called when getUsersByEmail() comes back with results.
    if (verbose) {
      console.log("Got test_users:");
      console.log(test_users);
    }
    if (test_users.length === 1) {
      return callback(new UnauthorizedError("No other users with same email"));
    }
    
    var potential_preauths = assemblePreauthorizationTestUserList(user, test_users);
    if (potential_preauths.length === 0) {
      return callback(new UnauthorizedError("No potential preauths"));
    }
    
    // Pop the first test user off the stack and process it asynchronously.
    var test_user = potential_preauths.shift();
    
    // This function ultimately calls an asyncrhonous function,
    // so don't do anything else after this.
    updateTestUserForPreauthorizationStatus(test_user, potential_preauths, context);
  }

  function assemblePreauthorizationTestUserList(user, test_users) {
    // Assemble a list of users with the same email as the original user,
    // (but which are not actually the same user account) that could
    // potentially be preauthorized in the required_groups.
    var potential_preauth_users = [];

    for (let i=0; i < test_users.length; i++) {
      var test_user = test_users[i];
      var isPreauthorizeable = false;
      if (test_user.user_id !== user.user_id) {
        
        // The test_user has a different user_id than what came in on the current user.
        // We are interested in this.
        for (let j=0; j < test_user.identities.length; j++) {
          var identity = test_user.identities[j];
          
          // Don't bother with the extra (expensive) AuthorizationExtension calls
          // if the provided identity is not pre-authorizeable.
          isPreauthorizeable = isIdentityPreauthorizeable(identity);
          if (isPreauthorizeable) {
            // Found an identity on the user that is pre-authorizeable.
            break;
          }
        }  // end for-loop over identities
      }  // end test of user-id
      if (isPreauthorizeable) {
        potential_preauth_users.push(test_user);
      }
    }  // end for-loop of test_users

    return potential_preauth_users;
  } // end isAnyTestUserPreauthorized()
  
  function isIdentityPreauthorizeable(identity) {
    // Return true if the provided user identity is something Auth0
    // will let us pre-authorize.  False otherwise.
 
    // XXX Use identity.isSocial?
    if (!identity.provider) {
      // No provider field.
      // We definitely want one of these.
      return false;
    }
    if (identity.provider !== "auth0") {
      // As of 6/28/2022, Auth0 will only let us add User/Pass Connections
      // to Authorization Extension Group lists. Therefore, the alternate
      // pre-authorized identity we seek *must* come from auth0.
      return false;
    }
    
    return true;
  } // end isIdentityPreauthorizeable()
  
  // This function is theived from the auto-generated Rule from the AuthorizationExtension
  // It should be just like the 1st rule in the global list of rules
  // except that here we use promises instead of calling the callback in getPolicy().
  function updateTestUserForPreauthorizationStatus(unupdated_test_user, remaining_preauths, context) {
    // Returns user_to_update with users, groups, and permissions added from the
    // Authorization Extension API call. If there was an error, that error will be
    // returned instead.
    
    // Don't need to reload lodash, as it is already in _
    var audience = '';
    audience = audience || (context.request && context.request.query && context.request.query.audience);
    if (audience === 'urn:auth0-authz-api') {
      return callback(new UnauthorizedError('no_end_users'));
    }

    audience = audience || (context.request && context.request.body && context.request.body.audience);
    if (audience === 'urn:auth0-authz-api') {
      return callback(new UnauthorizedError('no_end_users'));
    }

    // Call the asynchronous function...
    getPolicy(unupdated_test_user, context)
      .then((/* err, */ res, data) => processGetPolicy(res, data,
                                                 unupdated_test_user,
                                                 remaining_preauths, context))
      .catch((error) => callback(error));
    // Nothing else of substance should happen after this as the async stuff
    // takes over. Function definitions are OK, of course.
  }
  
  // Get the policy for the user.
  async function getPolicy(user_to_update, context) {
    
    const util = require("util");
    const post = util.promisify(request.post);
    
    // console.log("User to update: " + JSON.stringify(user_to_update, null, 4));
    
    const promise = post({
      url: EXTENSION_URL + "/api/users/" + user_to_update.user_id + "/policy/" + context.clientID,
      headers: {
        "x-api-key": configuration.AUTHZ_EXT_API_KEY
      },
      json: {
        connectionName: user_to_update.identities[0].connection || context.connection,
        groups: parseGroups(user_to_update.groups)
      },
      timeout: 5000
    });  // end post()
    
    // Convert groups to array
    function parseGroups(data) {
      if (typeof data === 'string') {
        // split groups represented as string by spaces and/or comma
        return data.replace(/,/g, ' ').replace(/\s+/g, ' ').split(' ');
      }
      return data;
    }  // end parseGroups()
    
    return promise;
  }  // end function getPolicy()
    
  function processGetPolicy(res, data, unupdated_test_user, remaining_preauths, context) {
    if (typeof data === 'undefined') {
      data = res.body;
    }
    
    if (verbose) {
      console.log("In processGetPolicy() with:");
      console.log("res = " + JSON.stringify(res, null, 4));
      console.log("data = " + JSON.stringify(data, null, 4));
      console.log("unupdated_test_user = " + JSON.stringify(unupdated_test_user, null, 4));
      console.log("remaining_preauths = " + remaining_preauths);
    }
    
    if (res.statusCode !== 200) {
      return callback(new UnauthorizedError('Authorization Extension: ' +
                                            ((res.body &&
                                              (res.body.message || res.body) ||
                                              res.statusCode))
                                           ));
    }

    // Update the user object.
    var updated_test_user = unupdated_test_user;

    updated_test_user.groups = data.groups;
    updated_test_user.roles = data.roles;
    updated_test_user.permissions = data.permissions;
    
    if (verbose) {
      console.log("updated_test_user: " + JSON.stringify(updated_test_user, null, 4));
    }
    
    var is_test_user_in_groups = isUserInRequiredGroups(updated_test_user, context);
    if (is_test_user_in_groups) {
      // Let the user through
      if (verbose) {
        console.log("Letting alt user through");
      }
      return callback(null, user, context);
    }
    
    // See if there are any more remaining_preauths to process
    if (remaining_preauths.length === 0) {
      if (verbose) {
        console.log("Alt user bounce");
      }
      // Original user not in any of the groups we wanted. Bounce.
      return callback(new UnauthorizedError('You are not in a required group to access ' +
                                          context.clientName + 
                                          '. Please supply a LEAF Team member with the email address ' +
                                          'associated with your GitHub account to assist in ' +
                                          'rectifying this.'));
    }
    
    // Pop the first test user off the stack and process it asynchronously.
    var test_user = remaining_preauths.shift();
    
    // This function ultimately calls an asyncrhonous function,
    // so don't do anything else after this.
    updateTestUserForPreauthorizationStatus(test_user, remaining_preauths, context);
  }
 
  // Specifically do not invoke the callback at the end of the method.
  // This signals the Rules system that asynchronous processing is not done yet,
  // and the infrastructure waits for any asynchronous results to come back.
}
