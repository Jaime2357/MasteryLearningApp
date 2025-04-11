'use client'

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ClientComponentProps {
    instructor_id: string;
}
const CourseCreatorComponent: React.FC<ClientComponentProps> = (instructor_id) => {
    const supabase = createClient();
    const router = useRouter();

    const [courseId, setCourseID] = useState<string>('');
    const [courseName, setCourseName] = useState<string>('');
    const [catalogCode, setCatalogCode] = useState<string>('');
    const [duplicated, setDuplicated] = useState<boolean[]>([false, false, false]);
    // 0: Id, 1: Name, 2: Code
    const [courseDescription, setCourseDescription] = useState<string>('')

    useEffect(() => {
    }, [duplicated])

    async function check(val: string, checkNo: number) {
        let check = 'course_id';
        if (checkNo === 0) {
            setCourseID(val);
        }
        if (checkNo === 1) {
            setCourseName(val);
            check = 'course_name';
        }
        if (checkNo === 2) {
            setCatalogCode(val)
            check = 'catalog_code';
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

    async function createCourse() {

        const newCourse = {
            course_id: courseId,
            course_name: courseName,
            catalog_code: catalogCode,
            course_description: courseDescription,
            instructor_id: instructor_id.instructor_id
        }

        console.log('Inserted Data: ', newCourse)

        const { error: courseCreationError } = await supabase
            .from('courses')
            .insert([newCourse]);

        if (courseCreationError) {
            console.error("Problem Creating Course: ", courseCreationError.message);
        }
        else {
            alert("Course Created Sucessfully");
            router.push(`/course-selection`);
        }
    }

    return (
        <div>
            <button onClick={() => router.push(`/course-selection`)}> Back to Course Selection </button>
            <h1> New Course </h1>
            <label>
                Course Name:
                <input
                    type="text"
                    value={courseName}
                    onChange={(e) => check(e.target.value, 1)}
                />
                {duplicated[1] && <p> This Course ID is in use by another course </p>}
            </label>
            <br />
            <label>
                Course ID:
                <input
                    type="text"
                    value={courseId}
                    onChange={(e) => check(e.target.value, 0)}
                />
                {duplicated[0] && <p> This Course ID is in use by another course </p>}
            </label>
            <br />
            <label>
                Catalog Code:
                <input
                    type="text"
                    value={catalogCode}
                    onChange={(e) => check(e.target.value, 2)}
                />
                {duplicated[2] && <p> This Course ID is in use by another course </p>}
            </label>
            <br />
            <label>
                Course Desc:
                <input
                    type="text"
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                />
            </label>
            <br />
            {(duplicated.every(element => element === false)
                && courseId != ''
                && courseName != ''
                && catalogCode != '') &&
                <button onClick={createCourse}> Create Course </button>
            }
        </div>
    )
}

export default CourseCreatorComponent;