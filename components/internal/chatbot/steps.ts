
const RESPONSES = {
    "Neuro AI": "Cognizant Neuro® AI is a preconfigured technology accelerator for faster AI applications adoption that" +
        " infuses AI and human expertise to empower clients to gain better solutions, faster. " +
        "The platform enables AI and software engineering teams to build and assemble flexible and secure AI solutions" +
        "—responsibly and ethically—enabling businesses to enhance productivity and scalability to " +
        "increase business revenue. ",
    "Generative": "Generative artificial intelligence or generative AI is a type of artificial intelligence (AI) " +
        "system capable of generating text, images, or other media in response to prompts. Generative AI models " +
        "learn the patterns and structure of their input training data, and then generate new data that " +
        "has similar characteristics",
    "LLM": "A large language model (LLM) is a language model consisting of a neural network with many parameters " +
        "(typically billions of weights or more), trained on large quantities of unlabeled text using " +
        "self-supervised learning or semi-supervised learning.[1] LLMs emerged around 2018 and perform well " +
        "at a wide variety of tasks. This has shifted the focus of natural language processing research away from " +
        "the previous paradigm of training specialized supervised models for specific tasks",
    "prompt": "In the context of a large language model like me, a \"prompt\" refers to the initial input or " +
        "instruction provided to the model in order to generate a desired response or output. " +
        "The prompt serves as a starting point or guiding instruction for the model to follow and " +
        "influences the content and style of the generated text. It can be a question, a statement, " +
        "or any other form of textual input that prompts the model to produce a coherent and relevant response.",
    "transformer": "A Transformer is a deep learning architecture used for natural language processing tasks, " +
        "particularly in the field of machine translation, text generation, and understanding. " +
        "It is based on the concept of self-attention mechanisms, enabling it to capture dependencies between " +
        "different words or tokens within a sequence more effectively. The Transformer model utilizes a series of " +
        "self-attention layers and feed-forward neural networks, allowing it to process and generate highly " +
        "contextualized representations of textual data. By leveraging attention mechanisms, " +
        "Transformers have demonstrated remarkable performance in various language-related tasks, making them a " +
        "fundamental component of modern language models.",
    "predictor": "In the context of Cognizant Neuro™ AI, a predictor is a modelused to train a " +
        "population of prescriptors. The predictor predicts, for a given Context and set of Actions, what the outcome" +
        "would be in the system being modeled. As such, a predictor is a type of surrogate model.",
    "Cognizant": "Cognizant, Inc. is a multinational technology company that provides a range of IT services and " +
        "solutions to businesses around the world. The company offers consulting, digital transformation, " +
        "technology services, and outsourcing solutions to help organizations enhance their operational efficiency, " +
        "improve customer engagement, and drive innovation. Cognizant operates across various industries, " +
        "including financial services, healthcare, manufacturing, retail, and more. Their services encompass areas " +
        "such as application development, data analytics, cloud computing, cybersecurity, artificial intelligence, " +
        "and robotic process automation. Cognizant aims to assist businesses in navigating the complexities of the " +
        "digital age and achieving their goals through technology-enabled strategies.",
    "training": "In the context of a neural network, training refers to the process of teaching the network " +
        "to perform a specific task or learn patterns and relationships within a dataset. " +
        "Training involves adjusting the network's parameters, also known as weights and biases, to minimize the " +
        "difference between the network's output and the desired output.",
    "prescriptor": "In the context of Cognizant Neuro™ AI, a prescriptor is a model which prescribes which Actions" +
        " to take in a given Context in order to optimize the expected Outcomes",
    "cao": "Contexts, Actions and Outcomes. In the context of Cognizant Neuro™ AI, contexts are the properties of the" +
        " problem that cannot be altered; actions are the values that _can_ be altered, and outcomes are the results of" +
        "executing those actions within the given context."
}

function getLLMResponse(query) {
    const queryLower = query.toLowerCase()
    const found = Object.entries(RESPONSES).find(e => queryLower.includes(e[0].toLowerCase()))
    return found?.[1] ?? "Sorry, I was unable to find any information about that in my knowledgebase."
}

export const chatbotSteps = [
    {
        id: "1",
        message: "Hi! I\"m your Cognizant Neuro™ AI assistant. Please type your question below.",
        trigger: "2"
    },
    {
        id: "2",
        user: true,
        trigger: "3"
    },
    {
        id: "3",
        message: ({previousValue}) => {return getLLMResponse(previousValue)},
        trigger: "4"
    },
    {
        id: "4",
        message: "Anything else you'd like to ask?",
        trigger: "2"
    },
]
