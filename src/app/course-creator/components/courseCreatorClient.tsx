'use client'

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/react-aria";
import { logout } from "@/app/actions";

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

        <>

        {/* Navbar */}
            <header className="px-8 pt-6 pb-4 border-b bg-lime-300">
                <nav className="grid grid-cols-4">
                    <Link href="/" className="col-start-2 col-end-4 text-center text-xl font-mono font-bold">Mastery Learning</Link>
                    <Button onPress={logout} className="justify-self-end cursor-pointer text-sm hover:underline focus-visible:underline outline-none">
                        Sign Out
                    </Button>
                </nav>
            </header>
            {/* Back to Course Selection */}
            <Link href="/course-selection" className="block w-fit mt-6 ml-6 outline-none text-gray-600 group">
                <ChevronLeft className="inline" strokeWidth={1} />
                <span className="align-middle group-hover:underline group-focus-visible:underline">Return to Course Selection</span>
            </Link>
            
            <main className="max-w-xl mx-auto px-4 py-12">
                <button
                    onClick={() => router.push(`/course-selection`)}
                    className="mb-8 text-gray-600 hover:underline focus-visible:underline text-sm"
                >
                    &larr; Back to Course Selection
                </button>
                <div className="bg-white border border-gray-200 rounded-xl shadow p-8">
                    <h1 className="font-mono font-bold text-2xl mb-8 text-lime-700">
                        New Course
                    </h1>

                    {/* Course Name */}
                    <div className="mb-6">
                        <label className="block font-semibold mb-1">Course Name</label>
                        <input
                            type="text"
                            value={courseName}
                            onChange={e => check(e.target.value, 1)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="Enter course name"
                        />
                        {duplicated[1] && (
                            <p className="text-red-500 text-sm mt-1">
                                This course name is in use by another course.
                            </p>
                        )}
                    </div>

                    {/* Course ID */}
                    <div className="mb-6">
                        <label className="block font-semibold mb-1">Course ID</label>
                        <input
                            type="text"
                            value={courseId}
                            onChange={e => check(e.target.value, 0)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="Enter course ID"
                        />
                        {duplicated[0] && (
                            <p className="text-red-500 text-sm mt-1">
                                This course ID is in use by another course.
                            </p>
                        )}
                    </div>

                    {/* Catalog Code */}
                    <div className="mb-6">
                        <label className="block font-semibold mb-1">Catalog Code</label>
                        <input
                            type="text"
                            value={catalogCode}
                            onChange={e => check(e.target.value, 2)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="Enter catalog code"
                        />
                        {duplicated[2] && (
                            <p className="text-red-500 text-sm mt-1">
                                This catalog code is in use by another course.
                            </p>
                        )}
                    </div>

                    {/* Course Description */}
                    <div className="mb-8">
                        <label className="block font-semibold mb-1">Course Description</label>
                        <input
                            type="text"
                            value={courseDescription}
                            onChange={e => setCourseDescription(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="Describe this course"
                        />
                    </div>

                    {(duplicated.every(element => element === false)
                        && courseId !== ''
                        && courseName !== ''
                        && catalogCode !== '') && (
                            <button
                                onClick={createCourse}
                                className="w-full bg-lime-300 hover:bg-lime-400 text-gray-900 font-semibold rounded px-4 py-2 shadow transition"
                            >
                                Create Course
                            </button>
                        )}
                </div>
            </main>
        </>
    )

}

export default CourseCreatorComponent;