'use client'

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";

interface ClientComponentProps {
    instructor_id: string;
}

type Questions = {
    question_id: number,
    question_body: string[]
    solutions: string[],
    feedback: string[],
    points: number,
    question_image: string[] | null,
    feedback_embed: string[] | null
}

const MyQuestionsComponent: React.FC<ClientComponentProps> = (instructor_id) => {

    const [questions, setQuestions] = useState<Questions[]>([]);

    useEffect(() => {
        initialize();
    }, [])

    const supabase = createClient();

    async function initialize() {

        const { data: myQuestions, error: myQuestionsError } = await supabase
            .from('questions')
            .select()
            .eq('creator_id', instructor_id.instructor_id);
        if (myQuestionsError) {
            console.error("Error retrieving questions: ", myQuestionsError.message)
            return null;
        }
        else{
            setQuestions(myQuestions)
        }

        console.log("Questions: ", myQuestions);
    }

    async function deleteQuestion(id: number) {
        const { error: deletionError } = await supabase
            .from('questions')
            .delete()
            .eq('question_id', id);
        if (deletionError) {
            console.error("Error deleting question: ", deletionError.message)
            return null;
        }
        else {
            alert('Question Deleted Successfully')
        }
    }

    return (
            <div>
                {questions.map((question) => (
                    <li key = {question.question_id}>

                        <h2> Points: </h2>
                        <p> {question.points} </p>

                        <button onClick={() => deleteQuestion(question.question_id)}> Delete </button>

                        <h1> Version 1 </h1>

                        <h2> Question: </h2>
                        <p> {question.question_body[0]} </p>

                        <h2> Answer: </h2>
                        <p> {question.solutions[0]} </p>

                        <h2> Feedback: </h2>
                        <p> {question.feedback[0]} </p>

                        <p> ----- </p>

                        <h1> Version 2 </h1>

                        <h2> Question: </h2>
                        <p> {question.question_body[1]} </p>

                        <h2> Answer: </h2>
                        <p> {question.solutions[1]} </p>

                        <h2> Feedback: </h2>
                        <p> {question.feedback[1]} </p>

                        <p> ----- </p>

                        <h1> Version 3 </h1>

                        <h2> Question: </h2>
                        <p> {question.question_body[2]} </p>

                        <h2> Answer: </h2>
                        <p> {question.solutions[2]} </p>

                        <h2> Feedback: </h2>
                        <p> {question.feedback[2]} </p>

                        <p> ----- </p>

                        <h1> Version 4 </h1>

                        <h2> Question: </h2>
                        <p> {question.question_body[3]} </p>

                        <h2> Answer: </h2>
                        <p> {question.solutions[3]} </p>

                        <h2> Feedback: </h2>
                        <p> {question.feedback[3]} </p>

                        <hr/>
                    </li>
                ))}
            </div>
    )
}

export default MyQuestionsComponent;