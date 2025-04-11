import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import InstructorDashboardComponent from './components/instructorDashboardClient'

type CourseParams = { course_id: string };

export default async function InstructorDashboard({ params }: { params: CourseParams }) {
    
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

    if (courseError || !course) {
        return <div>Error fetching course information.</div>;
    }

    // Fetch assignments
    const { data: assignments, error: assignmentError } = await supabase
        .from('assignments_list')
        .select()
        .eq('course_id', course_id);

    if (assignmentError || !assignments || assignments.length === 0) {
        return <div>No assignments found for this course.</div>;
    }

    return (
        <InstructorDashboardComponent
            course ={course}
            course_id = {course_id}
            initialAssignments ={assignments}
        />
    );
}
