import React from "react";
import Link from "next/link";
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server'

interface Instructor {
    instructor_id: string;
    first_name: string;
    last_name: string;
}

export default async function CourseSelection() {

    // Create Supabase Client
    const supabase = await createClient();

    // Obtain User Credentials from Session JWT, redirect if login is not detected
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        redirect('/login')
    }

    // User's Student or Intructor ID
    let id: string = '';
    let instructor = false;

    //Get User's ID and associated course IDs
    const { data: instructor_id } = await supabase.from('instructors').select('instructor_id').eq('system_id', data.user.id).single();
    if (!instructor_id) {
        const { data: student_id } = await supabase.from('students').select('student_id').eq('system_id', data.user.id).single();
        if (!student_id) {
            return (
                <div>
                    <p> No matching student or instructor ID found </p>
                </div>
            )
        }
        else {
            id = student_id.student_id;
        }
    }
    else {
        id = instructor_id.instructor_id;
        instructor = true;
    }

    let courseIds: number[];
    let courses;

    // Retrieved Courses
    if (instructor) {
        console.log(id)
        const { data: retrievedCourses } = await supabase.from('courses').select().eq('instructor_id', id);
        if (!retrievedCourses || retrievedCourses.length <= 0) {
            return <p> Courses not found </p>
        }
        courses = retrievedCourses;
    }
    else {
        const { data: course_ids } = await supabase.from('course_enrollments').select('course_id').eq('student_id', id);
        if (!course_ids || course_ids.length <= 0) {
            return <p> Not enrolled in any courses </p>
        }
        courseIds = course_ids.map(courseID => courseID.course_id);
        const { data: retrievedCourses } = await supabase.from("courses").select().in('course_id', courseIds);
        courses = retrievedCourses;
    }

    if (!courses) { // If courseID does not exist (Should not happen as there is a foreign key constraint)
        return (
            <div>
                <p> Error Retrieving Courses </p>
            </div>
        )
    }

    let instructorMap: Map<string, Instructor>;

    if (!instructor) {

        const instructorIds = courses.map(course => course.instructor_id);

        const { data: instructors } = await supabase.from("instructors").select().in('instructor_id', instructorIds);

        if (!instructors) { // If no matching instructors are found (Should not happen as there is a foreign key + unique constraint)
            return (
                <div>
                    <p> hi - theres nothing here </p>
                </div>
            )
        }

        instructorMap = new Map(instructors.map(instructor => [instructor.instructor_id, instructor]));

    }

    function getInstructor(instructor_id: string) {
        return instructorMap.get(instructor_id);
    }

    return (

        <div>
            {(instructor) &&
                <div>
                    <h1> Courses: </h1>
                    <ul>
                        {courses.map((course, index) => (
                            <li key={course.course_id || index}>
                                <Link href={`/instructor-dashboard/${course.course_id}`}>
                                ({course.course_id}) {course.catalog_code}: {course.course_name}
                                <br />
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <Link href={`/course-creator`}> Create Course </Link>
                    <p> ------------------------------------------</p>
                </div>
            }
            {(!instructor) &&
                <div>
                    <h1> Courses: </h1>
                    <ul>
                        {courses.map((course, index) => {
                            const instructor = getInstructor(course.instructor_id);
                            return (
                                <li key={course.course_id || index}>
                                    <Link href={`/student-dashboard/${course.course_id}`}>
                                        ({course.course_id}) {course.catalog_code}: {course.course_name}
                                        <br />
                                        Instructor: {instructor
                                            ? `${instructor.first_name} ${instructor.last_name}`
                                            : "Unknown Instructor"}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            }
        </div>
    )

}