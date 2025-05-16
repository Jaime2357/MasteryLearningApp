
import { createClient } from "@/utils/supabase/server";
import CourseEditorComponent from "./components/courseEditorClient";
import { redirect } from "next/navigation";

type CourseParams = { course_id: string }

interface PageProps {
  params: Promise<CourseParams>
}

export default async function CourseCreator({ params }: PageProps) {

    const supabase = await createClient();

    const { course_id } = await params;

    // Authenticate user
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
        redirect('/login');
    }

    const { data: instructor, error: idError } = await supabase
        .from('instructors')
        .select('instructor_id')
        .eq('system_id', userData.user.id)
        .single();

    if (idError || !instructor) {
        console.error("Access Denied: ", idError.message);
        return
    }

    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select()
        .eq('course_id', course_id)
        .single();

    if (courseError) {
        console.error("Problem retrieving course data: ", courseError.message);
        return null;
    }

    return (
        <CourseEditorComponent
            instructor_id={instructor.instructor_id}
            course_id = {course_id}
            course = {course}
        />
    )
}