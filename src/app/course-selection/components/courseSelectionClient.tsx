'use client'

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Course = {
    course_id: string;
    course_name: string;
    catalog_code: string;
    instructor_id: string;
}

type Instructor = {
    first_name: string;
    last_name: string;
}

interface ClientComponentProps {
    id: string;
    instructor: boolean;
    instructors: Map<string, Instructor>;
    courses: Course[];
}

const CourseSelectionComponent: React.FC<ClientComponentProps> = ({ id, instructor, instructors, courses }) => {
    const supabase = createClient();
    const router = useRouter();

    const [enrollmentCode, setEnrollmentCode] = useState<number>(0)

    async function courseAdd() {
        const { data: courseId, error: courseIdError } = await supabase
            .from('courses')
            .select('course_id')
            .eq('enrollment_code', enrollmentCode)
            .single();

        if (courseIdError) {
            if (courseIdError.message === 'JSON object requested, multiple (or no) rows returned') {
                alert("No matching courses found...")
                return;
            }
            else {
                console.error('Problem searching for course', courseIdError.message);
                return null;
            }
        }
        else {
            const { data: enrollmentCheck, error: enrollmentCheckError } = await supabase
                .from('course_enrollments')
                .select()
                .eq('student_id', id)
                .eq('course_id', courseId.course_id);

                console.log('Student ID: ', id)
                console.log('Course ID: ', courseId.course_id)
                console.log(enrollmentCheck)

            if (enrollmentCheckError) {
                console.error('Problem checking enrollments', enrollmentCheckError.message);
                return null;
            }

            if (enrollmentCheck.length > 0) {
                alert("You are already enrolled in this course.")
                return;
            }

            const newEnrollment = {
                student_id: id,
                course_id: courseId.course_id
            }

            const { error: enrollmentError } = await supabase
                .from('course_enrollments')
                .insert([newEnrollment])

            if (enrollmentError) {
                console.error('Problem enrolling in course: ', enrollmentError.message)
                return null;
            }
            alert("Successfully enrolled in course!")
            router.push(`student-dashboard/${courseId.course_id}`);

        }
    }


    function getInstructor(instructor_id: string) {
        return instructors.get(instructor_id);
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

                    <label>
                        Add Course:
                        <input
                            type="number"
                            maxLength={5}
                            onChange={(e) => setEnrollmentCode(Number(e.target.value))}
                        />
                        <button onClick={() => courseAdd()} disabled={enrollmentCode?.toString().length != 5}> Submit </button>
                    </label>

                </div>
            }
        </div>
    )
}

export default CourseSelectionComponent;