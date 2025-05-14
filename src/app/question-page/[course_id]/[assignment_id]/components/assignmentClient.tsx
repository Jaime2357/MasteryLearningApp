'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Circle } from "lucide-react";
import { Button, Input, Label, Radio, RadioGroup, TextField } from "@/components/react-aria";

type AssignmentName = {
	assignment_name: string;
};

type Question = {
	id: number;
	question_body: string[];
	points: number;
	solutions: string[];
	feedback: string[];
	question_image?: string[];
	feedback_images?: string[];
	feedback_videos?: string[];
	MCQ_options?: string[][];
	FRQ_err_marg: number[];
};


type Block = {
	block_id: number;
	question_ids: number[];
	mastery_threshold: number;
	total_points: number;
};

interface ClientComponentProps {
	assignmentId: string;
	assignmentName: AssignmentName;
	blocks: Block[];
	studentId: string;
	courseId: string;
}

function getYouTubeId(url: string): string | null {
	// Supports various YouTube URL formats
	const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
	const match = url.match(regex);
	return match ? match[1] : null;
}

const FeedbackMedia: React.FC<{ image?: string; video?: string }> = ({ image, video }) => {
	if (!image && !video) return null;

	const isYouTube = video && (video.includes('youtube.com') || video.includes('youtu.be'));
	const youtubeId = video && isYouTube ? getYouTubeId(video) : null;

	return (
		<div style={{ margin: '10px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
			{image && (
				<img
					src={image}
					alt="Feedback visual aid"
					style={{
						width: '120px',
						height: '120px',
						objectFit: 'cover',
						borderRadius: '4px'
					}}
				/>
			)}
			{video && isYouTube && youtubeId && (
				<div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
					<iframe
						src={`https://www.youtube.com/embed/${youtubeId}`}
						title="YouTube feedback video"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							height: '100%',
							border: 'none'
						}}
					/>
				</div>
			)}
			{video && !isYouTube && (
				<video
					controls
					src={video}
					style={{ width: '320px', maxWidth: '100%', borderRadius: '4px' }}
				/>
			)}
		</div>
	);
};

const AssignmentComponent: React.FC<ClientComponentProps> = ({
	assignmentId,
	assignmentName,
	blocks,
	studentId,
	courseId,
}) => {
	const router = useRouter();

	const [initialized, setInitialized] = useState(false);
	const [currentBlock, setCurrentBlock] = useState(0);
	const [version, setVersion] = useState(0);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [submissionId, setSubId] = useState(0);
	const [showFeedback, setShowFeedback] = useState(false);
	const [percentageCorrect, setPercentageCorrect] = useState(0);
	const [threshold, setThreshold] = useState(blocks[currentBlock].mastery_threshold);
	const [userAnswers, setUserAnswers] = useState<string[]>([]);
	const [questionImageUrls, setQuestionImageUrls] = useState<string[][]>([]);
	const [feedbackImageUrls, setFeedbackImageUrls] = useState<string[][]>([]);

	const supabase = createClient();

	useEffect(() => {
		initializeState();
	}, [currentBlock, version]);

	useEffect(() => {
		fetchQuestions();
	}, [initialized]);

	useEffect(() => {
		// No-op for showFeedback, reserved for future
	}, [showFeedback]);

	async function getSubmission() {
		const { data: stateData, error: stateError } = await supabase
			.from('student_submissions')
			.select('submission_id, current_block, current_version, finished')
			.eq('student_id', studentId)
			.eq('assignment_id', assignmentId)
			.single();

		if (stateError || !stateData) {
			// Create new submission record
			const submitData = {
				student_id: studentId,
				assignment_id: assignmentId,
			};

			const { error: newSubmitError } = await supabase
				.from('student_submissions')
				.insert([submitData]);

			if (newSubmitError) {
				console.error("Problem creating new submission record:", newSubmitError.message);
				return null;
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
		} else {
			setSubId(stateData.submission_id);
			setCurrentBlock(stateData.current_block);
			setVersion(stateData.current_version);
			setInitialized(true);

			const threshold_points = blocks[currentBlock].mastery_threshold;
			const total_points = blocks[currentBlock].total_points;
			if (total_points === 0) {
				setThreshold(0);
			} else {
				const thresholdPercent = (threshold_points / total_points) * 100;
				setThreshold(thresholdPercent);
			}
		}
	}

	async function fetchQuestions() {
		if (initialized) {
			if (!blocks[currentBlock]?.question_ids) {
				console.error('No question IDs found for current block.');
				return;
			}

			// Fetch feedback_images and feedback_videos!
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

			// --- Generate signed URLs for question images ---
			const BUCKET_NAME = 'question-images';
			const SIGNED_URL_EXPIRY = 600; // 10 minutes

			const questionUrls: string[][] = await Promise.all(
				(fetchedQuestions as Question[]).map(async (q) => {
					if (!q.question_image || !Array.isArray(q.question_image)) {
						return ['', '', '', ''];
					}
					return await Promise.all(
						[0, 1, 2, 3].map(async (versionIdx) => {
							const path = q.question_image?.[versionIdx];
							if (path && path.trim() !== '') {
								const { data } = await supabase
									.storage
									.from(BUCKET_NAME)
									.createSignedUrl(path, SIGNED_URL_EXPIRY);
								return data?.signedUrl || '';
							}
							return '';
						})
					);
				})
			);
			setQuestionImageUrls(questionUrls);

			// --- Generate signed URLs for feedback images ---
			const feedbackUrls: string[][] = await Promise.all(
				(fetchedQuestions as Question[]).map(async (q) => {
					if (!q.feedback_images || !Array.isArray(q.feedback_images)) {
						return ['', '', '', ''];
					}
					return await Promise.all(
						[0, 1, 2, 3].map(async (versionIdx) => {
							const path = q.feedback_images?.[versionIdx];
							if (path && path.trim() !== '') {
								const { data } = await supabase
									.storage
									.from(BUCKET_NAME)
									.createSignedUrl(path, SIGNED_URL_EXPIRY);
								return data?.signedUrl || '';
							}
							return '';
						})
					);
				})
			);
			setFeedbackImageUrls(feedbackUrls);
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
			if (!questions[index].MCQ_options) {
				if (isNaN(Number(answer))) {
					alert("Numerical Answers Only")
					return 0;
				}
				if (Number(answer) < (Number(answerKey[index]) + questions[index].FRQ_err_marg[version])
					&& Number(answer) > (Number(answerKey[index]) - questions[index].FRQ_err_marg[version])) {
					return questions[index].points
				}
				else {
					return 0;
				};
			}
			else {
				return answer === answerKey[index] ? questions[index].points : 0;
			}
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
		let percentCalc

		if (totalPossiblePoints === 0) {
			percentCalc = 0;
			setPercentageCorrect(0);
		}
		else {
			percentCalc = (totalPointsEarned / totalPossiblePoints) * 100
			setPercentageCorrect(percentCalc);
		}

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
			return
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

	console.log(percentageCorrect, '<', threshold)

	if (!initialized) {
		return <div> Loading... </div>
	}
	return (
		<>
			<header className="px-8 pt-6 pb-4 bg-lime-300 border-b sticky top-0 flex justify-between items-center">
				<Link href={`/student-dashboard/${courseId}`} className="outline-none group text-sm text-nowrap">
					<ChevronLeft className="inline" strokeWidth={1} />
					<span className="align-middle group-hover:underline group-focus-visible:underline">Exit Assignment</span>
				</Link>
				<h1 className="mx-4 truncate">
					{assignmentName.assignment_name}, Set {currentBlock + 1}
				</h1>
				<p className="text-sm text-nowrap">Attempts Left: {4 - version}</p>
			</header>
			<main className="mx-12 mt-6 max-w-4xl lg:mx-auto">
				{/* <Form> */}
				{questions.map((question, index) => (
					<div
						key={index}
						className="pt-8"
					>
						<h2 className="text-2xl font-bold inline">{`Question ${index + 1}`}</h2>
						<p className="text-gray-600">{`${question.points} point${question.points != 1 ? "s" : ""}`}</p>
						<p className="mt-4 p-4 min-w-xs w-fit bg-gray-200 rounded-xl font-mono">{question.question_body[version]}</p>
						{/* Display version-specific image if present */}
						{questionImageUrls[index]?.[version] && (
							<div style={{ margin: '10px 0' }}>
								<img
									src={questionImageUrls[index][version]}
									alt={`Question ${index + 1} visual aid`}
									style={{
										width: '120px',
										height: '120px',
										objectFit: 'cover',
										borderRadius: '4px'
									}}
								/>
							</div>
						)}
						{/* MCQ options if available, otherwise text input */}
						{question.MCQ_options &&
							question.MCQ_options[version]?.filter(opt => opt?.trim()).length >= 2 ?
							<RadioGroup
								className="flex flex-col mt-4 gap-1"
								value={userAnswers[index]}
								onChange={choice =>
									setUserAnswers(
										userAnswers.map((ans, i) =>
											i === index ? choice : ans
										)
									)
								}
							>
								<Label className="block text-sm">Your Answer</Label>
								{question.MCQ_options[version]
									.filter(opt => opt?.trim())
									.map((option, optIndex) => (
										// <div key={optIndex} style={{ margin: '5px 0' }}>
										<Radio
											className="group hover:cursor-pointer w-fit"
											key={optIndex}
											// id={`q${index}-opt${optIndex}`}
											// name={`question-${index}`}
											value={optIndex.toString()}
										// checked={userAnswers[index] === optIndex.toString()}
										// onChange={() =>
										// 	setUserAnswers(
										// 		userAnswers.map((ans, i) =>
										// 			i === index ? optIndex.toString() : ans
										// 		)
										// 	)
										// }
										>
											<Circle size={20} strokeWidth={1} className="inline group-data-selected:fill-lime-300"></Circle>
											<span className="align-bottom ml-2">{option}</span>
											{/* {String.fromCharCode(65 + optIndex)}. {option} */}
											{/* <label htmlFor={`q${index}-opt${optIndex}`}>
												{String.fromCharCode(65 + optIndex)}. {option}
											</label> */}
										</Radio>
										// </div>
									))}
							</RadioGroup>
							// <div className="mcq-options" style={{ margin: '10px 0' }}>
							// 	{question.MCQ_options[version]
							// 		.filter(opt => opt?.trim())
							// 		.map((option, optIndex) => (
							// 			<div key={optIndex} style={{ margin: '5px 0' }}>
							// 				<input
							// 					type="radio"
							// 					id={`q${index}-opt${optIndex}`}
							// 					name={`question-${index}`}
							// 					value={optIndex.toString()}
							// 					checked={userAnswers[index] === optIndex.toString()}
							// 					onChange={() =>
							// 						setUserAnswers(
							// 							userAnswers.map((ans, i) =>
							// 								i === index ? optIndex.toString() : ans
							// 							)
							// 						)
							// 					}
							// 				/>
							// 				<label htmlFor={`q${index}-opt${optIndex}`} style={{ marginLeft: '8px' }}>
							// 					{String.fromCharCode(65 + optIndex)}. {option}
							// 				</label>
							// 			</div>
							// 		))}
							// </div>
							:
							<TextField
								className="mt-3"
								type="text"
								inputMode="decimal"
								autoComplete="off"
								value={userAnswers[index] || ''} // Fallback for undefined
								onChange={val => {
									// Allow empty, negatives, decimals, and partial inputs
									if (/^-?\d*\.?\d*$/.test(val)) {
										setUserAnswers(prev => {
											const newAnswers = [...prev];
											newAnswers[index] = val;
											return newAnswers;
										});
									}
								}}
								onKeyDown={(e) => {
									// Allow navigation/editing keys
									const allowedKeys = [
										'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight',
										'Delete', 'Home', 'End'
									];
									// Allow numbers, single minus at start, single decimal
									if (
										!allowedKeys.includes(e.key) &&
										!/[0-9]/.test(e.key) &&
										!(e.key === '-' && e.currentTarget.selectionStart === 0) &&
										!(e.key === '.' && !e.currentTarget.value.includes('.'))
									) {
										e.preventDefault();
									}
								}}
								onPaste={(e) => {
									const paste = e.clipboardData.getData('text/plain');
									if (!/^-?\d*\.?\d*$/.test(paste)) {
										e.preventDefault();
									}
								}}
								isDisabled={showFeedback}
							>
								<Label className="block text-sm">Your Answer</Label>
								<Input className="border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 disabled:bg-gray-200" />
							</TextField>

						}

						{/* Feedback section with improved MCQ answer display */}
						{(showFeedback) &&
							<div>
								<p> Correct Answer: {
									question.MCQ_options &&
										question.MCQ_options[version]?.filter(opt => opt?.trim()).length >= 2 &&
										!isNaN(Number(question.solutions[version])) ?
										`${String.fromCharCode(65 + Number(question.solutions[version]))}. ${question.MCQ_options[version][Number(question.solutions[version])]
										}` :
										question.solutions[version]
								}</p>
								<p> Feedback: {question.feedback[version]}</p>
								{/* Existing feedback media display */}
								{(feedbackImageUrls[index]?.[version] ||
									(question.feedback_videos && question.feedback_videos[version])) && (
										<FeedbackMedia
											image={feedbackImageUrls[index]?.[version]}
											video={question.feedback_videos ? question.feedback_videos[version] : undefined}
										/>
									)}
							</div>
						}
					</div>
				))}
				{(!showFeedback) &&
					<Button
						className="border rounded-lg p-2 mt-8 cursor-pointer bg-lime-50 hover:bg-lime-300 active:bg-gray-300 outline-lime-300 focus-visible:outline-2"
						onClick={() => {
							const submittedAnswers = userAnswers;
							const answerKey = questions.map(question => question.solutions[version]);
							gradeBlockAndSubmit(
								submittedAnswers,
								answerKey,
								blocks[currentBlock].block_id,
								version,
								studentId,
								questions
							);
						}}
					>
						Submit and Grade
					</Button>
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
				{/* </Form> */}
			</main>

			{/* This div was to simulate page scroll for testing. */}
			{/* <div className="h-screen"></div> */}
		</>
	);
};

export default AssignmentComponent;