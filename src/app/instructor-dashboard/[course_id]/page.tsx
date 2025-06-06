import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import InstructorDashboardComponent from './components/instructorDashboardClient'

type CourseParams = { course_id: string };

interface PageProps {
  params: Promise<CourseParams>
}

export default async function InstructorDashboard({ params }: PageProps) {
    
    const supabase = await createClient(); // Create Supabase Client
    const { course_id } = await params; // Extract Course ID

     const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            redirect('/login');
            return null; // Prevent further execution
        }

    // Fetch course information
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('course_name, enrollment_code')
        .eq('course_id', course_id)
        .single();

    if (courseError) {
        console.error("Error fetching course information: ", courseError.message);
        return null;
    }

    // Fetch assignments
    const { data: assignments, error: assignmentError } = await supabase
        .from('assignments_list')
        .select()
        .eq('course_id', course_id);

    if (assignmentError) {
        console.error("Problem retrieving assignments: ", assignmentError.message);
        return null;
    }

    return (
        <InstructorDashboardComponent
            course ={course}
            course_id = {course_id}
            initialAssignments ={assignments}
        />
    );
}
