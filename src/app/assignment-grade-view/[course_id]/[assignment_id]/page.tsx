import React from 'react';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from "@/components/react-aria";
import { logout } from "@/app/actions";
import { ChevronLeft } from "lucide-react";

type AssignmentParams = { course_id: string, assignment_id: string };

// interface Question {
//     question_id: string;
//     question_body: string[];
//     points: number;
//     solutions: string[];
//     question_image?: string[]; // Added image paths
// }

interface SubmittedQuestion {
	questionText: string;
	submittedAnswer: string | null;
	correctAnswer: string | null;
	correctAnswerText: string; // New field for MCQ text
	grade: number | null;
	pointsPossible: number;
	image?: string;
	isMCQ?: boolean;
	MCQ_options?: string[];
}

interface Version {
	version: number;
	questions: SubmittedQuestion[];
}

// interface BlockSubmission {
//   block_id: string;
//   block_version: number;
//   answers: string[]; // Array of submitted answers
//   grade: number[]; // Array of grades for each question
// }

interface Block {
	blockNumber: number;
	versions: Version[];
}

interface StructuredData {
	blocks: Block[];
}

// interface SubmissionData {
//   blocks_complete: boolean[];
//   block_scores: number[];
// }

// interface AssignmentData {
//   assignment_name: string;
//   due_date: string;
//   total_points: number;
// }

export default async function AssignmentResultPage({ params }: { params: AssignmentParams }) {
	const supabase = await createClient();

	// Authenticate user
	const { data: userData, error: authError } = await supabase.auth.getUser();
	if (authError || !userData?.user) {
		redirect('/login');
		return null; // Prevent further execution
	}

	// Get student ID
	const { data: studentId } = await supabase.from('students').select('student_id').eq('system_id', userData.user.id).single();
	if (!studentId) {
		return (
			<div>
				<p> UH OH </p>
			</div>
		);
	}

	const { course_id, assignment_id } = await params;

	// Fetch general submission data
	const { data: submissionData } = await supabase
		.from("student_submissions")
		.select("blocks_complete, block_scores")
		.eq('assignment_id', assignment_id)
		.eq('student_id', studentId.student_id)
		.single();

	if (!submissionData) {
		return <div> Error Retrieving Submission Data </div>;
	}

	// Fetch general assignment data
	const { data: assignmentData } = await supabase
		.from("assignments_list")
		.select('assignment_name, due_date, total_points')
		.eq('assignment_id', assignment_id)
		.single();

	if (!assignmentData) {
		return <div> Error Retrieving Assignment Data </div>;
	}

	// Fetch question block data
	const { data: blocks } = await supabase
		.from("question_blocks")
		.select('block_id, block_number, question_ids')
		.eq('assignment_id', assignment_id);

	if (!blocks) {
		return <div> Error Retrieving Question Blocks </div>;
	}

	const blockIds = blocks.map(block => block.block_id);
	const questionIds = blocks.reduce((acc, block) => acc.concat(block.question_ids), []);

	// Fetch questions
	const { data: questions } = await supabase
		.from("questions")
		.select('question_id, question_body, points, solutions, question_image, MCQ_options')
		.in('question_id', questionIds);

	// Generate signed URLs for images
	const BUCKET_NAME = 'question-images'; // Replace with your bucket name
	const SIGNED_URL_EXPIRY = 600; // 10 minutes

	const questionsWithImages = await Promise.all(
		(questions || []).map(async (question) => {
			const image_urls: string[] = [];
			if (question.question_image && Array.isArray(question.question_image)) {
				for (const path of question.question_image) {
					if (path?.trim()) {
						const { data } = await supabase.storage
							.from(BUCKET_NAME)
							.createSignedUrl(path, SIGNED_URL_EXPIRY);
						if (data?.signedUrl) {
							image_urls.push(data.signedUrl);
						}
					}
				}
			}
			return { ...question, image_urls };
		})
	);

	// Fetch block submissions
	const { data: blockSubmissions } = await supabase
		.from("block_submissions")
		.select('block_id, block_version, answers, grade')
		.in('block_id', blockIds);

	if (!blockSubmissions) {
		return <div> Error Retrieving Block Submission Data </div>;
	}

	// Create a structured data object for rendering
	const structuredData: StructuredData = {
		blocks: blocks.map((block) => {
			const blockSubmissionVersions = blockSubmissions.filter(
				(submission) => submission.block_id === block.block_id
			);

			const blockQuestions = questionsWithImages.filter(
				(question) => block.question_ids.includes(question.question_id)
			);

			const versions: Version[] = Array.from(
				{ length: Math.max(...blockSubmissionVersions.map(s => s.block_version)) + 1 },
				(_, versionIndex) => {
					// Find the exact submission for this block and version
					const versionSubmission = blockSubmissions.find(
						(submission) =>
							submission.block_id === block.block_id &&
							submission.block_version === versionIndex
					);

					if (!versionSubmission) return { version: versionIndex + 1, questions: [] };

					// Map questions to their submitted answers using the correct indices
					const versionQuestions: SubmittedQuestion[] = blockQuestions.map((question) => {
						// Use block.question_ids to find the correct index in the answers array
						const questionIndexInBlock = block.question_ids.findIndex((id: number) => id === question.question_id);

						// Get the submitted answer using the correct index
						const submittedAnswer = versionSubmission.answers[questionIndexInBlock] ?? "Not Submitted";

						// MCQ handling (existing code)
						const mcqOptions = question.MCQ_options?.[versionIndex]?.filter((opt: string) => opt?.trim() !== '') ?? [];
						const isMCQ = mcqOptions.length >= 2;

						// Format answers for display
						let formattedSubmittedAnswer = submittedAnswer;
						let correctAnswerText = question.solutions[versionIndex] ?? "Unknown";

						if (isMCQ) {
							// Format submitted MCQ answer
							if (!isNaN(Number(submittedAnswer))) {
								const idx = Number(submittedAnswer);
								formattedSubmittedAnswer = mcqOptions[idx]
									? `${String.fromCharCode(65 + idx)}. ${mcqOptions[idx]}`
									: submittedAnswer;
							}

							// Format correct MCQ answer
							const solutionIndex = Number(correctAnswerText);
							if (!isNaN(solutionIndex) && mcqOptions[solutionIndex]) {
								correctAnswerText = `${String.fromCharCode(65 + solutionIndex)}. ${mcqOptions[solutionIndex]}`;
							}
						}

						return {
							questionText: question.question_body[versionIndex] ?? "Unknown Question",
							submittedAnswer: formattedSubmittedAnswer,
							correctAnswer: question.solutions[versionIndex] ?? "Unknown",
							correctAnswerText,
							grade: versionSubmission.grade[questionIndexInBlock] ?? null,
							pointsPossible: question.points,
							image: question.image_urls?.[versionIndex],
							isMCQ,
							mcqOptions
						};
					});

					return {
						version: versionIndex + 1,
						questions: versionQuestions,
					};
				}
			);

			return {
				blockNumber: block.block_number,
				versions,
			};
		}),
	};

	let totalScore

	if (assignmentData.total_points <= 0) {
		totalScore = 100
	}
	else {
		totalScore = parseFloat(((submissionData.block_scores.reduce((acc: number, curr: number) => acc + curr, 0)) / assignmentData.total_points * 100).toFixed(2));

	}

	const currentDate: Date = new Date();
	const dueDate: Date = new Date(assignmentData.due_date);

	const milliDif = Math.abs(dueDate.getTime() - currentDate.getTime());

	const daysLeft: number = Math.floor(milliDif / (1000 * 60 * 60 * 24))


	return (
		<>
			{/* Navbar */}
			<header className="px-8 pt-6 pb-4 border-b bg-lime-300">
				<nav className="grid grid-cols-4">
					<Link href="/" className="col-start-2 col-end-4 text-center text-xl font-mono font-bold">Mastery Learning</Link>
					<Button onPress={logout} className="justify-self-end cursor-pointer text-sm hover:underline focus-visible:underline outline-none">
						Sign Out
					</Button>
				</nav>
			</header>
			{/* Back to Dashboard */}
			<Link href={`/student-dashboard/${course_id}`} className="block w-fit mt-6 ml-6 outline-none text-gray-600 group">
				<ChevronLeft className="inline" strokeWidth={1} />
				<span className="align-middle group-hover:underline group-focus-visible:underline">Return to Assignments</span>
			</Link>
			<main className="mx-12 mt-6">
				<h1 className="text-3xl font-bold">{assignmentData.assignment_name} Results</h1>
				<p className="mt-4 text-lg font-semibold">Score: <span className="font-normal">{totalScore}%</span></p>
				<p className="mt-2 text-lg font-semibold">Due Date: </p>
				<p>{new Date(assignmentData.due_date).toLocaleString()}</p>
				<p>
					({(daysLeft < 1) && "Less than 1 day left to submit."}
					{(daysLeft > 0) && `${daysLeft} days left to submit`})
				</p>

				{structuredData.blocks.map((block) => (
					<div
						key={block.blockNumber}>
						<h2 className="mt-4 font-semibold text-lg">Question Set {block.blockNumber}:</h2>
						{block.versions.map((version) => (
							<div key={version.version}>
								<p>Version {version.version}:</p>
								{version.questions.map((question, index) => (
									<div key={index}>
										{question.image && (
											<div style={{ margin: '10px 0' }}>
												<img
													src={question.image}
													alt={`Question ${index + 1} visual aid`}
													style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px' }}
												/>
											</div>
										)}
										{/* <p>Question {index + 1}: {question.questionText}</p> */}
										<p className="indent-4">Question {index + 1}:</p>

										{/* Remove the MCQ options display section entirely */}

										<p className="indent-8">Submitted Answer: {
											// Map submitted numeric answers to option text for MCQs
											question.isMCQ && !isNaN(Number(question.submittedAnswer))
												? `${String.fromCharCode(65 + Number(question.submittedAnswer))}. ${question.MCQ_options?.[Number(question.submittedAnswer)] || 'Invalid option'
												}`
												: question.submittedAnswer
										}</p>
										<p className="indent-8">Correct Answer: {question.correctAnswerText}</p>
										<p className="indent-8">Points Earned: {question.grade ?? "0"}/{question.pointsPossible}</p>
									</div>
								))}
							</div>
						))}
					</div>
				))}
			</main>
		</>
	);
}




