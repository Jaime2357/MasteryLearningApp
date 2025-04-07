import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AssignmentCreatorComponent from './components/assignmentCreatorClient';

type AssignmentParams = { course_id: string };

export default async function AssignmentCreator({ params }: { params: AssignmentParams }) {
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

    const {course_id} = await params;

    // Pass data to client component
    return (
        <AssignmentCreatorComponent
            instructor_id={instructor.instructor_id}
            course_id={course_id}
        />
    );
}
