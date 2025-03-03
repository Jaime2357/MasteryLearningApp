import React from "react";
import { createClient } from '@/utils/supabase/server'

export default async function Page() {

    const id = '016213067' // Temporary Hardcoded Variable

    const supabase = await createClient();
    const { data: my_courseIDs } = await supabase.from('course_enrollments').select('course_id').eq('student_id', id);

    if (!my_courseIDs || my_courseIDs.length <= 0) { // Error Checking for if student has no enrollments
        return (
            <div>
                <p> You are not enrolled in any courses </p>
            </div>
        )
    }

    const courseIds = my_courseIDs.map(courseID => courseID.course_id);
    const { data: courses } = await supabase.from("courses").select().in('course_id', courseIds);

    if (!courses) { // If courseID does not exist (Should not happen as there is a foreign key constraint)
        return (
            <div>
                <p> hi - theres nothing here </p>
            </div>
        )
    }

    const instructorIds = courses.map(course => course.instructor_id);

    const { data: instructors } = await supabase.from("instructors").select().in('instructor_id', instructorIds);

    if (!instructors) { // If no matching instructors are found (Should not happen as there is a foreign key + unique constraint)
        return (
            <div>
                <p> hi - theres nothing here </p>
            </div>
        )
    }

    const instructorMap = new Map(instructors.map(instructor => [instructor.instructor_id, instructor]));

    function getInstructor(instructor_id: string){
        return instructorMap.get(instructor_id);
    }

    return (

        <div>
            <h1> Courses: </h1>
            <ul>
                {courses.map((course, index) => (
                    <li key={course.id || index}>
                        ({course.course_id}) {course.catalog_code}: {course.course_name}
                        <br />
                        Instructor: {getInstructor(course.instructor_id).first_name} {getInstructor(course.instructor_id).last_name}
                    </li>
                ))}
            </ul>
        </div>


    )

}