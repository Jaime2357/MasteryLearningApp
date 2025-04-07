// import { createClient } from '@/utils/supabase/server';
// import Link from 'next/link';
// import { redirect } from 'next/navigation';

// type AssignmentParams = { course_id: string, assignment_id: number };

// interface SubmittedQuestion {
//     questionText: string;
//     submittedAnswer: string | null;
//     correctAnswer: string | null;
//     grade: number | null;
//     pointsPossible: number;
// }

// interface Version {
//     version: number;
//     questions: SubmittedQuestion[];
// }

// interface Block {
//     blockNumber: number;
//     versions: Version[];
// }

// interface StructuredData {
//     blocks: Block[];
// }

// export default async function AssignmentPreviewPage({ params }: { params: AssignmentParams }) {

//     // Create Supabase connection
//     const supabase = await createClient();
//     const { course_id, assignment_id } = await params;

//      const { data: userData, error: authError } = await supabase.auth.getUser();
//         if (authError || !userData?.user) {
//             redirect('/login');
//             return null; // Prevent further execution
//         }



//     // Check for Instructor
//     const { data: instructorID, error: notInstructor } = await supabase
//         .from("instructors")
//         .select("instructor_id");

//     if (notInstructor || !instructorID) {
//         return <div> Access Denied </div>;
//     }

//     // Fetch general assignment data
//     const { data: assignmentData } = await supabase
//         .from("assignments_list")
//         .select('assignment_name, due_date, total_points')
//         .eq('assignment_id', assignment_id)
//         .single();

//     if (!assignmentData) {
//         return <div> Error Retrieving Assignment Data </div>;
//     }

//     // Fetch question block data
//     const { data: blocks } = await supabase
//         .from("question_blocks")
//         .select('block_id, block_number, question_ids')
//         .eq('assignment_id', assignment_id);

//     if (!blocks) {
//         return <div> Error Retrieving Question Blocks </div>;
//     }

//     const questionIds = blocks.reduce((acc, block) => acc.concat(block.question_ids), []);

//     // Fetch questions
//     const { data: questions } = await supabase
//         .from("questions")
//         .select('question_id, question_body, points, solutions')
//         .in('question_id', questionIds);

//     if (!questions) {
//         return <div> Error Retrieving Questions </div>;
//     }

//     // Create a structured data object for rendering
//     const structuredData: StructuredData = {
//         blocks: blocks.map((block) => {
//             const blockSubmissionVersions = blockSubmissions.filter((submission) => submission.block_id === block.block_id);
//             const blockQuestions = questions.filter((question) => block.question_ids.includes(question.question_id));

//             const versions: Version[] = Array.from({ length: Math.max(...blockSubmissionVersions.map(s => s.block_version)) + 1 }, (_, versionIndex) => {
//                 const versionSubmissions = blockSubmissionVersions.find((submission) => submission.block_version === versionIndex);

//                 if (!versionSubmissions) return { version: versionIndex + 1, questions: [] };

//                 const versionQuestions: SubmittedQuestion[] = blockQuestions.map((question, questionIndex) => ({
//                     questionText: question.question_body[versionIndex] ?? "Unknown Question",
//                     submittedAnswer: versionSubmissions.answers[questionIndex] ?? "Not Submitted", // Use the question index to fetch the answer
//                     correctAnswer: question.solutions[versionIndex] ?? "Unknown",
//                     grade: versionSubmissions.grade[questionIndex] ?? null, // Use the question index to fetch the grade
//                     pointsPossible: question.points,
//                 }));

//                 return {
//                     version: versionIndex + 1,
//                     questions: versionQuestions,
//                 };
//             });

//             return {
//                 blockNumber: block.block_number,
//                 versions,
//             };
//         }),
//     };

//     return (
//         <div>
//             <div>
//                 <Link href={`/instructor-dashboard/${course_id}`}> Back </Link>
//             </div>
//             <h1>{assignmentData.assignment_name}</h1>
//             <p>Due Date: {assignmentData.due_date}</p>

//             {blocks.map((block) => (
//                 <div key={block.block_number}>

//                     <h3>Question Block {block.block_number}:</h3>

//                     {block.versions.map((version) => (
//                         <div key={version.version}>
//                             <h4>Version {version.version}:</h4>
//                             {version.questions.map((question, index) => (
//                                 <div key={index}>
//                                     <p>Question {index + 1}: {question.questionText}</p>
//                                     <p>- Submitted Answer: {question.submittedAnswer}</p>
//                                     <p>- Correct Answer: {question.correctAnswer}</p>
//                                     <p>-- Grade: {question.grade ?? "0"}/{question.pointsPossible}</p>
//                                 </div>
//                             ))}
//                         </div>
//                     ))}
//                 </div>
//             ))}
//         </div>
//     );
// }




