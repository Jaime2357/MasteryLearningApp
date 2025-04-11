'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type AssignmentName = {
    assignment_name: string;
};

type Question = {
    id: number;
    question_body: string[];
    points: number;
    solutions: string[];
    feedback: string[];
};

type Block = {
    block_id: number;
    question_ids: number[];
    threshold: number;
};

interface ClientComponentProps {
    assignmentId: string;
    assignmentName: AssignmentName;
    blocks: Block[];
    studentId: string;
    courseId: string;
}

const AssignmentComponent: React.FC<ClientComponentProps> = ({ assignmentId, assignmentName, blocks, studentId, courseId }) => {

    const router = useRouter();

    const [initialized, setInitialized] = useState(false);
    const [currentBlock, setCurrentBlock] = useState(0);
    const [version, setVersion] = useState(0);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [submissionId, setSubId] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [percentageCorrect, setPercentageCorrect] = useState(0);
    const [threshold, setThreshold] = useState(blocks[currentBlock].threshold); //Temporary
    const [userAnswers, setUserAnswers] = useState(
        questions.map(() => ({ answer: '', correct: false }))
    );

    // Use the createClient function to initialize a Supabase client
    const supabase = createClient();

    useEffect(() => {
        initializeState();
    }, []);


    async function getSubmission() {
        const { data: stateData, error: stateError } = await supabase
            .from('student_submissions')
            .select('submission_id, current_block, current_version, finished')
            .eq('student_id', studentId)
            .eq('assignment_id', assignmentId)
            .single();

        if (stateError || !stateData) {
            console.log('Creating Submission Record...');

            const submitData = {
                student_id: studentId,
                assignment_id: assignmentId,
            };

            const { error: newSubmitError } = await supabase
                .from('student_submissions')
                .insert([submitData]);

            if (newSubmitError) {
                console.error("Problem creating new submission record:", newSubmitError.message);
                return null; // Handle the error gracefully
            }

            // Fetch the newly created row
            const { data: newStateData, error: fetchError } = await supabase
                .from('student_submissions')
                .select('submission_id, current_block, current_version, finished')
                .eq('student_id', studentId)
                .eq('assignment_id', assignmentId)
                .single();

            if (fetchError || !newStateData) {
                console.error("Problem fetching newly created submission record:", fetchError?.message);
                return null;
            }

            return newStateData;
        }

        return stateData;

    }

    async function initializeState() {

        const stateData = await getSubmission();

        if (!stateData) {
            console.error("Problem getting submission information");
            return;
        }

        if (stateData.finished) {
            router.push(`/assignment-grade-view/${courseId}/${assignmentId}`);
        }
        else {
            setSubId(stateData.submission_id)
            setCurrentBlock(stateData.current_block);
            setVersion(stateData.current_version);
            setInitialized(true);
            setThreshold(blocks[currentBlock].threshold)
        }
    }

    async function fetchQuestions() {

        if (initialized) {
            if (!blocks[currentBlock]?.question_ids) {
                console.error('No question IDs found for current block.');
                return;
            }

            console.log(currentBlock, "/", blocks[currentBlock].question_ids)
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
        let gradedAnswers = submittedAnswers.map((answer, index) => {
            return answer === answerKey[index] ? questions[index].points : 0;
        });

        if (!gradedAnswers) {
            gradedAnswers = [0];
        }

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
        const percentCalc = (totalPointsEarned / totalPossiblePoints) * 100
        setPercentageCorrect(percentCalc);

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
            .update({ score: percentCalc })
            .eq('block_id', blocks[currentBlock].block_id)
            .eq('student_id', studentId)
            .eq('block_version', version);

        alert(`You scored ${totalPointsEarned}/${totalPossiblePoints} points (${percentCalc.toFixed(2)}%)!`);

        setShowFeedback(true)
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

            const { error: completionUpdateError } = await supabase
                .from('student_submissions')
                .update({ finished: true })
                .eq('submission_id', submissionId);

            if (completionUpdateError) {
                console.error("Error Updating Completion")
            }
            router.push(`/assignment-grade-view/${courseId}/${assignmentId}`);
        }

        const { data: savedBlock } = await supabase
            .from('student_submissions')
            .select('current_block')
            .eq('submission_id', submissionId)
            .single();

        if (!savedBlock) {
            console.error('Error reading assignment submission:');
            return;
        }

        const { } = await supabase
            .from('student_submissions')
            .update({ current_block: savedBlock.current_block + 1, current_version: 0 })
            .eq('submission_id', submissionId);

        setCurrentBlock(currentBlock + 1);

        setVersion(0);
    }

    async function nextVersion() {
        if (version + 1 >= 4) {
            alert("You have completed all versions!");
            nextBlock();
        }
        else {
            const { data: savedVersion } = await supabase
                .from('student_submissions')
                .select('current_version')
                .eq('submission_id', submissionId)
                .single();

            if (!savedVersion) {
                console.error('Error reading assignment submission:');
                return;
            }

            const { } = await supabase
                .from('student_submissions')
                .update({ current_version: savedVersion.current_version + 1 })
                .eq('submission_id', submissionId);

            setVersion(version + 1);
        }
    }

    function advance(score: number, threshold: number) {

        setShowFeedback(false);

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

    if (!initialized) {
        return <div> Loading... </div>
    }
    return (
        <div>
            <div>
                {(!showFeedback) && <Link href={`/student-dashboard/${courseId}`}> Back </Link>}
            </div>
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
                        <br />
                        {(showFeedback) &&
                            <div>
                                <p> Correct Answer: {question.solutions[version]}</p>
                                <p> Feedback: {question.feedback[version]}</p>
                            </div>
                        }
                    </li>
                ))}
            </ul>

            {(!showFeedback) &&
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

            }
            {(showFeedback && (percentageCorrect >= threshold)) &&
                <button onClick={() => { advance(percentageCorrect, threshold); }}>
                    Next
                </button>
            }
            {(showFeedback && (percentageCorrect < threshold)) &&
                <button onClick={() => { advance(percentageCorrect, threshold); }}>
                    Retry
                </button>
            }

        </div>
    );
};

export default AssignmentComponent;
