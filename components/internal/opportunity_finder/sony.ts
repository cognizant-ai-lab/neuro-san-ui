/* eslint-disable max-len */
export const SONY_INPUT = `
### Scoping the Use Case: Rewards Program Optimization

#### Context Attributes

1. **User Demographics**
   - Age: Integer
   - Gender: {Male, Female, Non-binary, Prefer not to say}
   - Location: {Country, State/Province, City}
   - Income Level: {Low, Medium, High}

2. **Purchase History**
   - Total Amount Spent: Integer (in USD)
   - Number of Purchases: Integer
   - Types of Products Purchased: {Games, Consoles, Accessories, Subscriptions}
   - Frequency of Purchases: {Daily, Weekly, Monthly, Yearly}

3. **Gaming Activity**
   - Total Hours Played: Integer
   - Number of Games Played: Integer
   - Types of Games Played: {Action, Adventure, RPG, Sports, Puzzle, etc.}
   - Average Session Length: Integer (in minutes)
   - In-Game Achievements: Integer

4. **Engagement Metrics**
   - Number of Logins per Month: Integer
   - Participation in Events: {Yes, No}
   - Social Interactions: {High, Medium, Low}

5. **Reward Program Participation**
   - Membership Duration: Integer (in months)
   - Number of Rewards Redeemed: Integer
   - Types of Rewards Redeemed: {Discounts, Free Games, Merchandise, In-Game Items}
   - Points Accumulated: Integer

6. **User Feedback**
   - Satisfaction Score: Integer (1-100)
   - Number of Complaints: Integer
   - Types of Complaints: {Reward Availability, Reward Value, Program Usability}

7. **Marketing Interaction**
   - Response to Promotions: {Positive, Neutral, Negative}
   - Click-Through Rate on Emails: Percentage
   - Participation in Surveys: {Yes, No}

8. **Social Media Activity**
   - Number of Followers: Integer
   - Number of Posts: Integer
   - Engagement Rate: Percentage

9. **Device Usage**
   - Primary Device Used: {PS4, PS5, PC, Mobile}
   - Number of Devices Linked: Integer
   - Average Device Usage Time: Integer (in hours)

10. **Subscription Status**
    - Subscription Type: {PS Plus, PS Now, None}
    - Subscription Duration: Integer (in months)
    - Renewal Rate: Percentage

#### Action Attributes

1. **Types of Rewards Offered**
   - {Discounts, Free Games, Merchandise, In-Game Items, Exclusive Content}

2. **Frequency of Rewards**
   - {Daily, Weekly, Monthly, Quarterly, Yearly}

3. **Point Conversion Rates**
   - Points to USD Conversion: Float
   - Points Required for Rewards: Integer

4. **Personalization of Rewards**
   - {High, Medium, Low}

5. **Reward Notification Methods**
   - {Email, SMS, In-App Notification, Social Media}

#### Outcome Attributes

1. **User Engagement**
   - Number of Active Users: Integer
   - Average Session Length: Integer (in minutes)
   - Frequency of Logins: Integer (per month)

2. **Reward Redemption Rates**
   - Total Rewards Redeemed: Integer
   - Redemption Rate: Percentage
   - Types of Rewards Redeemed: {Discounts, Free Games, Merchandise, In-Game Items}

3. **Customer Satisfaction**
   - Satisfaction Score: Integer (1-100)
   - Net Promoter Score (NPS): Integer
   - Number of Positive Reviews: Integer

4. **Cost of Rewards Program**
   - Total Cost of Rewards: Integer (in USD)
   - Cost per User: Float (in USD)
   - Cost per Redemption: Float (in USD)

### Conclusion

By scoping the use case for optimizing the PlayStation Stars Rewards Program, we have identified key context, action, and outcome attributes. These attributes will help in designing and implementing a NeuroAI solution to enhance user engagement, increase reward redemption rates, and improve customer satisfaction while managing the cost of the rewards program effectively.
Below is a Python script to generate a table with 2000 rows using the scoped attributes for the PlayStation Stars Rewards Program optimization. The script will generate realistic and reasonable data for context, action, and outcome attributes, and save the data into a CSV file.

\`\`\`python
import pandas as pd
import numpy as np
import random

# Define the possible values for each attribute
development_timeline = ['EarlyStage', 'MidStage', 'LateStage', 'FinalStage']
resource_allocation = ['Low', 'Medium', 'High']
market_readiness = ['NotReady', 'PartiallyReady', 'FullyReady']
game_genre = ['Action', 'Adventure', 'RPG', 'Sports', 'Simulation', 'Strategy', 'Puzzle', 'Horror']
target_platform = ['PlayStation5', 'PlayStation4', 'PC', 'Multi-platform']
competitor_release_dates = ['NoCompetitorRelease', 'CompetitorReleaseWithin1Month', 'CompetitorReleaseWithin3Months', 'CompetitorReleaseWithin6Months']
user_feedback = ['VeryNegative', 'Negative', 'Neutral', 'Positive', 'VeryPositive']
development_milestones = ['AdjustMilestones', 'KeepMilestones']
resource_reallocation = ['IncreaseResources', 'DecreaseResources', 'MaintainResources']
release_date = ['MoveUp', 'Delay', 'KeepSame']
additional_features = ['AddFeatures', 'RemoveFeatures', 'KeepFeatures']
marketing_campaign_intensity = ['Increase', 'Decrease', 'Maintain']
quality_assurance_testing = ['IncreaseTesting', 'DecreaseTesting', 'MaintainTesting']
game_quality = ['Poor', 'Fair', 'Good', 'VeryGood', 'Excellent']
market_reception = ['VeryNegative', 'Negative', 'Neutral', 'Positive', 'VeryPositive']

# Function to generate a single row of data
def generate_row():
    context = {
        'DevelopmentTimeline': random.choice(development_timeline),
        'ResourceAllocation': random.choice(resource_allocation),
        'MarketReadiness': random.choice(market_readiness),
        'DevelopmentTeamSize': random.randint(5, 100),
        'Budget': random.randint(100000, 10000000),
        'GameGenre': random.choice(game_genre),
        'TargetPlatform': random.choice(target_platform),
        'HistoricalPerformance': random.randint(10000, 1000000),
        'CompetitorReleaseDates': random.choice(competitor_release_dates),
        'UserFeedback': random.choice(user_feedback),
        'MarketingSpend': random.randint(50000, 5000000)
    }
    
    action = {
        'DevelopmentMilestones': random.choice(development_milestones),
        'ResourceReallocation': random.choice(resource_reallocation),
        'ReleaseDate': random.choice(release_date),
        'AdditionalFeatures': random.choice(additional_features),
        'MarketingCampaignIntensity': random.choice(marketing_campaign_intensity),
        'QualityAssuranceTesting': random.choice(quality_assurance_testing)
    }
    
    # Outcome is influenced by context and action
    if context['MarketReadiness'] == 'FullyReady' and action['ReleaseDate'] == 'KeepSame':
        game_quality_outcome = 'Excellent'
    else:
        game_quality_outcome = random.choice(game_quality)
    
    if game_quality_outcome in ['VeryGood', 'Excellent']:
        market_reception_outcome = 'VeryPositive'
    else:
        market_reception_outcome = random.choice(market_reception)
    
    outcome = {
        'GameQuality': game_quality_outcome,
        'DevelopmentCost': context['Budget'] + random.randint(-50000, 50000),
        'MarketReception': market_reception_outcome
    }
    
    return {**context, **action, **outcome}

# Generate the data
data = [generate_row() for _ in range(1500)]

# Create a DataFrame
df = pd.DataFrame(data)

# Save to CSV
df.to_csv('game_development_and_release_scheduling.csv', index=False)

print("Data generation complete. Saved to 'game_development_and_release_scheduling.csv'.")
\`\`\`

This script generates 1500 rows of data with realistic and reasonable distributions for the attributes. The outcomes are influenced by the context and actions to ensure that there are patterns to learn when creating an ML model. The data is saved into a CSV file named \`game_development_and_release_scheduling.csv\`.

`
