'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ClientComponentProps {
    instructor_id: string;
    course_id: string;
    assignment_id: string | null;
}

const QuestionCreatorComponent: React.FC<ClientComponentProps> = ({ instructor_id, course_id, assignment_id }) => {

    // Use the createClient function to initialize a Supabase client
    const supabase = createClient();
    const router = useRouter();

    // variables to store solutions
    const [questionBodies, setQuestions] = useState<string[]>(['','','','']);
    const [solutions, setSolutions] = useState<string[]>(['','','',''])
    const [points, setPoints] = useState<number>(0);
    const [feedbackBodies, setFeedback] = useState<string[]>(['','','',''])

    async function createQuestion() {

        const newQuestion = {
            question_body: questionBodies,
            points: points,
            solutions: solutions,
            feedback: feedbackBodies,
            creator_id: instructor_id,
        }
        const {data: verif, error: questionCreationError} = await supabase
        .from('questions')
        .insert([newQuestion])
        .select()
        .single();

        console.log("Inserted Question: ", verif);
        
        if( questionCreationError){
            console.error("Problem Creating New Question");
        }
        else{
            alert("success");
            router.push(`/assignment-creator/${course_id}/${assignment_id}`)
        }
    }
    
    // Helper Function to update question body input
    const saveQuestionBody = (questionBody: string, index: number) => {
        setQuestions((prev) => {
            const newQuestionBodies = [...prev];
            newQuestionBodies[index] = questionBody;
            return newQuestionBodies;
        });
    };

    // Helper Function to update solution input
    const saveSolution = (solution: string, index: number) => {
        setSolutions((prev) => {
            const newSolutions = [...prev];
            newSolutions[index] = solution;
            return newSolutions;
        });
    };

    // Helper Function to update feedback input
    const saveFeedback = (feedback: string, index: number) => {
        setFeedback((prev) => {
            const newFeedbackBodies = [...prev];
            newFeedbackBodies[index] = feedback;
            return newFeedbackBodies;
        });
    };

    return (
        <div>
            <Link href={`/assignment-creator/${course_id}/${assignment_id}`}> Back to assignment </Link>

            <h1> New Question: </h1>

            <h3> Points: </h3>
            <input
                type="number"
                value={points}
                onChange={(e) =>
                    setPoints(Number(e.target.value))
                }
            />

            <h1> Version 1 </h1>
            <h2> Question: </h2>
            <input
                type="text"
                value={questionBodies[0]}
                onChange={(e) =>
                    saveQuestionBody(e.target.value, 0)
                }
            />
            <h2> Solution: </h2>
            <input
                type="text"
                value={solutions[0]}
                onChange={(e) =>
                    saveSolution(e.target.value, 0)
                }
            />
            <h2> Feedback: </h2>
            <input
                type="text"
                value={feedbackBodies[0]}
                onChange={(e) =>
                    saveFeedback(e.target.value, 0)
                }
            />

            <hr></hr>

            <h1> Version 2 </h1>
            <h2> Question: </h2>
            <input
                type="text"
                value={questionBodies[1]}
                onChange={(e) =>
                    saveQuestionBody(e.target.value, 1)
                }
            />
            <h2> Solution: </h2>
            <input
                type="text"
                value={solutions[1]}
                onChange={(e) =>
                    saveSolution(e.target.value, 1)
                }
            />
            <h2> Feedback: </h2>
            <input
                type="text"
                value={feedbackBodies[1]}
                onChange={(e) =>
                    saveFeedback(e.target.value, 1)
                }
            />

            <hr></hr>

            <h1> Version 3 </h1>
            <h2> Question: </h2>
            <input
                type="text"
                value={questionBodies[2]}
                onChange={(e) =>
                    saveQuestionBody(e.target.value, 2)
                }
            />
            <h2> Solution: </h2>
            <input
                type="text"
                value={solutions[2]}
                onChange={(e) =>
                    saveSolution(e.target.value, 2)
                }
            />
            <h2> Feedback: </h2>
            <input
                type="text"
                value={feedbackBodies[2]}
                onChange={(e) =>
                    saveFeedback(e.target.value, 2)
                }
            />

            <hr></hr>

            <h1> Version 4 </h1>
            <h2> Question: </h2>
            <input
                type="text"
                value={questionBodies[3]}
                onChange={(e) =>
                    saveQuestionBody(e.target.value, 3)
                }
            />
            <h2> Solution: </h2>
            <input
                type="text"
                value={solutions[3]}
                onChange={(e) =>
                    saveSolution(e.target.value, 3)
                }
            />
            <h2> Feedback: </h2>
            <input
                type="text"
                value={feedbackBodies[3]}
                onChange={(e) =>
                    saveFeedback(e.target.value, 3)
                }
            />

            <button onClick={createQuestion}> Save Question </button>

        </div>
    );
};

export default QuestionCreatorComponent;