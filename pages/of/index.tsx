// Main function.
import {InfoTip} from "../../components/infotip"
import {OpportunityFinder} from "../../components/internal/opportunity_finder/opportunity_finder"
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
import NewBar from "../../components/newbar"

export default function OpportunityFinderPage() {
    return (
        <div
            id="main-div"
            style={{width: "90%", height: "600px"}}
        >
            <NewBar
                id="projects-bar"
                InstanceId="opportunity_finder"
                Title="Opportunity Finder"
                DisplayNewLink={false}
                InfoTip={
                    <InfoTip
                        id="projects"
                        info={OpportunityFinderPage.pageContext}
                        size={20}
                    />
                }
            />
            <OpportunityFinder /* eslint-disable-line enforce-ids-in-jsx/missing-ids */ />
        </div>
    )
}

OpportunityFinderPage.authRequired = true
OpportunityFinderPage.pageContext =
    "This page is for investigating new opportunities for NeuroAI using an advanced LLM. Given a company name, " +
    "it will provide a list of opportunities for applying NeuroAI to the company's decision-making processes. " +
    "The user will then be able to select one of these opportunities and request a more detailed analysis for " +
    "that use case."
