import {ReactMarkdown} from "react-markdown/lib/react-markdown";
import {useEffect, useState} from "react";
import rehypeRaw from "rehype-raw";

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function UserGuide() {
    const [userGuide, setUserGuide] = useState(null)


    const getData = async () => {
        fetch('user_guide.md',
            {
                headers: {
                    'Content-Type': 'text/markdown',
                    'Accept': 'text/markdown'
                }
            }
        )
            .then(response => response.text())
            .then(text => setUserGuide(text))
    }
    useEffect(() => {
        getData()
    }, [])


    return <>
        { /* 2/6/23 DEF - ReactMarkdown does not have an id property when compiling */ }
        <ReactMarkdown      // eslint_disable-line enforce-ids-in-jsx/missing-ids
            rehypePlugins={[rehypeRaw]} className='prose'>
            {userGuide}
        </ReactMarkdown>
    </>
}

UserGuide.authRequired = true
