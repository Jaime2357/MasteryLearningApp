import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import QuestionCreatorComponent from './components/questionCreatorClient';

type AssignmentParams = { course_id: string, assignment_id: string };

export default async function QuestionCreator({ params }: { params: AssignmentParams }) {
    const supabase = await createClient();

    // Authenticate user
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
        redirect('/login');
    }

    const {data: instructor, error: idError} = await supabase
    .from('instructors')
    .select('instructor_id')
    .eq('system_id', userData.user.id)
    .single();

    if(idError || !instructor){
        console.error("Access Denied: ", idError.message);
        return
    }

    const {course_id, assignment_id} = await params;

    // Pass data to client component
    return (
        <QuestionCreatorComponent
            instructor_id={instructor.instructor_id}
            course_id={course_id}
            assignment_id={assignment_id}
        />
    );
}
