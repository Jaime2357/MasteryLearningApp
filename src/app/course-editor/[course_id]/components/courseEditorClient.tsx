'use client'

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Course = {
    course_id: string;
    course_name: string;
    catalog_code: string;
    course_description: string;
}
interface ClientComponentProps {
    instructor_id: string;
    course_id: string;
    course: Course;
}

const CourseEditorComponent: React.FC<ClientComponentProps> = ({ instructor_id, course_id, course }) => {
    const supabase = createClient();
    const router = useRouter();

    const [courseName, setCourseName] = useState<string>('');
    const [catalogCode, setCatalogCode] = useState<string>('');
    const [duplicated, setDuplicated] = useState<boolean[]>([false, false, false]);
    // 0: Id, 1: Name, 2: Code
    const [courseDescription, setCourseDescription] = useState<string>('')

    useEffect(() => {
    }, [duplicated])

    async function check(val: string, checkNo: number) {
        let check = 'course_name';
        if (checkNo === 1) {
            setCourseName(val);
            if (val === course.course_name) {
                setDuplicated(prev => {
                    const newDupes = [...prev];
                    newDupes[checkNo] = false;
                    return newDupes;
                })
                return;
            }
        }
        if (checkNo === 2) {
            setCatalogCode(val)
            check = 'catalog_code';
            if (val === course.catalog_code) {
                setDuplicated(prev => {
                    const newDupes = [...prev];
                    newDupes[checkNo] = false;
                    return newDupes;
                })
                return;
            }
        }

        const { data: retrieved, error: RetrievalError } = await supabase
            .from('courses')
            .select()
            .eq(check, val);

        if (RetrievalError) {
            console.error('Problem checking for duplicates: ', RetrievalError.message);
        }
        else {
            if (retrieved.length > 0) {
                setDuplicated(prev => {
                    const newDupes = [...prev];
                    newDupes[checkNo] = true;
                    return newDupes;
                })
            }
            else {
                setDuplicated(prev => {
                    const newDupes = [...prev];
                    newDupes[checkNo] = false;
                    return newDupes;
                })
            }
        }
    }

    async function updateCourse() {

        let insertedName = courseName;
        let insertedCode = catalogCode;
        let insertedDescription = courseDescription;

        if (courseName === '') { insertedName = course.course_name }
        if (catalogCode === '') { insertedCode = course.catalog_code }
        if (courseDescription === '') { insertedDescription = course.course_description }

        const newCourseData = {
            course_id: course_id,
            course_name: insertedName,
            catalog_code: insertedCode,
            course_description: insertedDescription,
            instructor_id: instructor_id
        }

        console.log('Updated Data: ', newCourseData)

        const { error: courseUpdateError } = await supabase
            .from('courses')
            .update([newCourseData])
            .eq('course_id', course_id);

        if (courseUpdateError) {
            console.error("Problem Updating Course: ", courseUpdateError.message);
        }
        else {
            alert("Course Updated Sucessfully");
            router.push(`/instructor-dashboard/${course_id}`);
        }
    }

    return (
        <div>
            <button onClick={() => router.push(`/instructor-dashboard/${course_id}`)}> Back to Course </button>
            <h1> Edit Course </h1>
            <label>
                <h1> Course Name: </h1>
                <h2> {course.course_name}</h2>
                <input
                    type="text"
                    value={courseName}
                    onChange={(e) => check(e.target.value, 1)}
                />
                {duplicated[1] && <p> This Course ID is in use by another course </p>}
            </label>
            <br />
            <label>
                <h1> Catalog Code: </h1>
                <h2> {course.catalog_code} </h2>
                <input
                    type="text"
                    value={catalogCode}
                    onChange={(e) => check(e.target.value, 2)}
                />
                {duplicated[2] && <p> This Course ID is in use by another course </p>}
            </label>
            <br />
            <label>
                <h1> Course Description: </h1>
                <h2> {course.course_description}</h2>
                <input
                    type="text"
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                />
            </label>
            <br />
            {(duplicated.every(element => element === false)
                && (courseName != '' || catalogCode != '')) &&
                <button onClick={updateCourse}> Update Course </button>
            }
        </div>
    )
}

export default CourseEditorComponent;