import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

type AssignmentParams = { assignment_id: string };

interface Question {
  question_id: string;
  question_body: string[]; // Array of question texts
  points: number;
  solutions: string[]; // Array of correct answers
}

interface SubmittedQuestion {
  questionText: string;
  submittedAnswer: string | null;
  correctAnswer: string | null;
  grade: number | null;
  pointsPossible: number;
}

interface Version {
  version: number;
  questions: SubmittedQuestion[];
}

interface BlockSubmission {
  block_id: string;
  block_version: number;
  answers: string[]; // Array of submitted answers
  grade: number[]; // Array of grades for each question
}

interface Block {
  blockNumber: number;
  versions: Version[];
}

interface StructuredData {
  blocks: Block[];
}

interface SubmissionData {
  blocks_complete: boolean[];
  block_scores: number[];
}

interface AssignmentData {
  assignment_name: string;
  due_date: string;
  total_points: number;
}

export default async function QuestionPage({ params }: { params: AssignmentParams }) {
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
  
    const { assignment_id } = await params;
  
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
      .select('question_id, question_body, points, solutions')
      .in('question_id', questionIds);
  
    if (!questions) {
      return <div> Error Retrieving Questions </div>;
    }
  
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
        const blockSubmissionVersions = blockSubmissions.filter((submission) => submission.block_id === block.block_id);
        const blockQuestions = questions.filter((question) => block.question_ids.includes(question.question_id));
  
        const versions: Version[] = Array.from({ length: Math.max(...blockSubmissionVersions.map(s => s.block_version)) + 1 }, (_, versionIndex) => {
          const versionSubmissions = blockSubmissionVersions.find((submission) => submission.block_version === versionIndex);
  
          if (!versionSubmissions) return { version: versionIndex + 1, questions: [] };
  
          const versionQuestions: SubmittedQuestion[] = blockQuestions.map((question, questionIndex) => ({
            questionText: question.question_body[versionIndex] ?? "Unknown Question",
            submittedAnswer: versionSubmissions.answers[questionIndex] ?? "Not Submitted", // Use the question index to fetch the answer
            correctAnswer: question.solutions[versionIndex] ?? "Unknown",
            grade: versionSubmissions.grade[questionIndex] ?? null, // Use the question index to fetch the grade
            pointsPossible: question.points,
          }));
  
          return {
            version: versionIndex + 1,
            questions: versionQuestions,
          };
        });
  
        return {
          blockNumber: block.block_number,
          versions,
        };
      }),
    };

    const totalScore = parseFloat(((submissionData.block_scores.reduce((acc:number, curr:number) => acc + curr, 0))/assignmentData.total_points*100).toFixed(2));
  
    return (
      <div>
        <h2>{assignmentData.assignment_name}</h2>
        <h3> Grade: {totalScore}% </h3>
        <p>Due Date: {assignmentData.due_date}</p>
  
        {structuredData.blocks.map((block) => (
          <div key={block.blockNumber}>
            <h3>Question Block {block.blockNumber}:</h3>
            {block.versions.map((version) => (
              <div key={version.version}>
                <h4>Version {version.version}:</h4>
                {version.questions.map((question, index) => (
                  <div key={index}>
                    <p>Question {index + 1}: {question.questionText}</p>
                    <p>- Submitted Answer: {question.submittedAnswer}</p>
                    <p>- Correct Answer: {question.correctAnswer}</p>
                    <p>-- Grade/Points Possible: {question.grade ?? "0"}/{question.pointsPossible}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  
  
  
  
