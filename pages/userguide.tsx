import {ReactMarkdown} from "react-markdown/lib/react-markdown";
import {useEffect, useState} from "react";


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
        <ReactMarkdown className='prose'>{userGuide}</ReactMarkdown>
    </>
}

UserGuide.authRequired = true