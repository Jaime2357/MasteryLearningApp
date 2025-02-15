import React from "react"

const Page = () => {

    const assignments = [1, 2, 3];
    let key = 0;

    return <ul>
        {assignments.map((assignment) => (<li key={key++}>
            {key}
        </li>))}
    </ul>
}

export default Page