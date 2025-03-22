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
    block_id: number;
    question_ids: number[];
};

interface ClientComponentProps {
    assignmentName: AssignmentName;
    blocks: Block[];
    submissionId: number;
    studentId: string;
}

const ClientComponent: React.FC<ClientComponentProps> = ({ assignmentName, blocks, studentId, submissionId }) => {
    const [currentBlock, setCurrentBlock] = useState(0);
    const [version, setVersion] = useState(0);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [userAnswers, setUserAnswers] = useState(
        questions.map(() => ({ answer: '', correct: false }))
    );

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
        setUserAnswers(fetchedQuestions.map(() => ({ answer: '', correct: false })));
    }

    async function gradeBlockAndSubmit(
        submittedAnswers: string[],
        answerKey: string[],
        blockId: number,
        blockVersion: number,
        studentId: string,
        questions: Question[]
    ): Promise<void> {
        // Grade each answer
        const gradedAnswers = submittedAnswers.map((answer, index) => {
            return answer === answerKey[index] ? questions[index].points : 0;
        });

        // Calculate total points earned
        const totalPointsEarned = gradedAnswers.reduce<number>(
            (sum, grade) => sum + grade,
            0 // Explicitly set initial value and type
        );
        console.log('Points Earned:', totalPointsEarned)

        // Calculate total possible points
        const totalPossiblePoints = questions.reduce<number>(
            (sum, question) => sum + question.points,
            0 // Explicitly set initial value and type
        );

        // Calculate percentage correct
        const percentageCorrect = (totalPointsEarned / totalPossiblePoints) * 100;

        // Prepare data for insertion into Supabase
        const submissionData = {
            student_id: studentId,
            block_id: blockId,
            block_version: blockVersion,
            answers: submittedAnswers,
            grade: gradedAnswers,
            submission_id: submissionId
        };

        const { error } = await supabase
            .from('block_submissions')
            .insert([submissionData]);

        if (error) {
            console.error('Error inserting submission:', error.message);
            return;
        }

        const { } = await supabase
            .from('block_submissions')
            .update({ score: percentageCorrect })
            .eq('block_id', blocks[currentBlock].block_id)
            .eq('student_id', studentId)
            .eq('block_version', version);

        alert(`You scored ${totalPointsEarned}/${totalPossiblePoints} points (${percentageCorrect.toFixed(2)}%)!`);

        advance(percentageCorrect, 100);
    }

    async function nextBlock() {

        const { data: completion } = await supabase
            .from('student_submissions')
            .select('blocks_complete')
            .eq('submission_id', submissionId)
            .single();

        if (!completion) {
            console.error('Error reading assignment submission:');
            return;
        }

        const { error } = await supabase
            .from('student_submissions')
            .update({ blocks_complete: completion.blocks_complete + 1 })
            .eq('submission_id', submissionId);

        if (error) {
            console.error('Error updating assignment submission:', error);
        }

        const { data: scores } = await supabase
            .from('block_submissions')
            .select('score')
            .eq('student_id', studentId)
            .eq('block_id', blocks[currentBlock].block_id);

        if (!scores || scores.length === 0) {
            console.warn('No scores found for the block.');
            return;
        }

        const maxScore = Math.max(...scores.map(score => score.score));

        console.log('Maximum Score:', maxScore);

        const { data: assignmentScores } = await supabase
            .from('student_submissions')
            .select('block_scores')
            .eq('submission_id', submissionId)
            .single();

        let scoreArray = [];

        if (assignmentScores && assignmentScores.block_scores) {
            if (Array.isArray(assignmentScores.block_scores)) {
                scoreArray = assignmentScores.block_scores;
            } else {
                console.warn('block_scores is not an array. Initializing as an empty array.');
                scoreArray = [];
            }
        }

        const newScoreArray = [...scoreArray, maxScore];

        const { } = await supabase
            .from('student_submissions')
            .update({ block_scores: newScoreArray })
            .eq("submission_id", submissionId);


        if (currentBlock + 1 >= blocks.length) {
            alert("You have completed all blocks!");
            return;
        }

        setCurrentBlock(currentBlock + 1);

        setVersion(0);
    }

    async function nextVersion() {
        if (version + 1 >= 4) {
            alert("You have completed all versions!");
            nextBlock();
        }
        else {
            setVersion(version + 1);
        }
    }

    function advance(score: number, threshold: number) {

        if (score < threshold) {
            nextVersion();
        }
        else {
            nextBlock();
        }
    }

    useEffect(() => {
        fetchQuestions();
    }, [currentBlock]);

    return (
        <div>
            <h1>{assignmentName.assignment_name}</h1>
            <ul>
                <h1> Question Set {currentBlock + 1} </h1>
                <p> Attempts Left: {4 - version}</p>
                {questions.map((question, index) => (
                    <li key={index}>
                        Question {index + 1} ({question.points} Points):
                        <br />
                        {question.question_body[version]}

                        <input
                            type="text"
                            value={userAnswers[index].answer}
                            onChange={(e) =>
                                setUserAnswers(
                                    userAnswers.map((answer, i) =>
                                        i === index ? { answer: e.target.value, correct: false } : answer
                                    )
                                )
                            }
                        />
                    </li>
                ))}
            </ul>

            <button
                onClick={() => {
                    const submittedAnswers = userAnswers.map(answer => answer.answer);
                    const answerKey = questions.map(question => question.solutions[version]);

                    gradeBlockAndSubmit(
                        submittedAnswers,
                        answerKey,
                        blocks[currentBlock].block_id,
                        version,
                        studentId, // Replace with actual student ID from props or state
                        questions // Pass questions array to calculate points
                    );
                }}
            >
                Submit Answers
            </button>

        </div>
    );
};

export default ClientComponent;
