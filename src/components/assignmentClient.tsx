'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

type AssignmentName = {
    assignment_name: string;
};

type Question = {
    id: number;
    question_body: string[];
    points: number;
    solutions: string[];
};

type Block = {
    question_ids: number[];
};

interface ClientComponentProps {
    assignmentName: AssignmentName;
    blocks: Block[];
}

const ClientComponent: React.FC<ClientComponentProps> = ({ assignmentName, blocks }) => {
    const [currentBlock, setCurrentBlock] = useState(0);
    const [version, setVersion] = useState(0);
    const [questions, setQuestions] = useState<Question[]>([]);

    // Use the createClient function to initialize a Supabase client
    const supabase = createClient();

    async function fetchQuestions() {
        if (!blocks[currentBlock]?.question_ids) {
            console.error('No question IDs found for current block.');
            return;
        }
        console.log(currentBlock, "/", blocks)
        const { data: fetchedQuestions, error } = await supabase
            .from("questions")
            .select()
            .in('question_id', blocks[currentBlock].question_ids);


        if (error) {
            console.error('Error fetching questions:', error.message);
            return;
        }

        if (!fetchedQuestions || fetchedQuestions.length === 0) {
            console.warn('No questions found for current block.');
            return;
        }

        setQuestions(fetchedQuestions as Question[]);
    }

    function nextBlock() {
        if (currentBlock + 1 >= blocks.length) {
            alert("You have completed all blocks!");
            return;
        }

        setCurrentBlock(currentBlock + 1);
        setVersion(0);
    }

    function nextVersion() {
        if (version >= 4) {
            alert("You have completed all versions!");
            return;
        }
        setVersion(version + 1);
    }

    useEffect(() => {
        fetchQuestions();
    }, [currentBlock]);

    return (
        <div>
            <h1>{assignmentName.assignment_name}</h1>
            <ul>
                {questions.map((question, index) => (
                    <li key={index}>
                        Question {index + 1} ({question.points} Points):
                        <br />
                        {question.question_body[version]}
                        <br />
                        Answer: {question.solutions[version]}
                    </li>
                ))}
            </ul>
            <button onClick={nextBlock}>Next Block</button>
            <button onClick={nextVersion}>Next Version</button>
        </div>
    );
};

export default ClientComponent;
