/**
 * Returns the Cognizant logo with a link to the corporate website.
 */
export const getCognizantLogoImage = () => (
    <a
        id="splash-logo-link"
        href="https://www.cognizant.com/us/en"
        style={{
            display: "flex",
            paddingLeft: "0.15rem",
        }}
        target="_blank"
        rel="noopener noreferrer"
    >
        <img
            id="logo-img"
            width="200"
            height="45"
            src="/cognizant-logo-white.svg"
            alt="Cognizant Logo"
        />
    </a>
)
