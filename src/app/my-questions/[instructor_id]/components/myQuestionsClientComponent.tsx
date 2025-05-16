'use client';

import { logout } from "@/app/actions";
import { Button } from "@/components/react-aria";
import { createClient } from "@/utils/supabase/client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface ClientComponentProps {
    instructor_id: string;
}

type Questions = {
    question_id: number,
    question_body: string[],
    solutions: string[],
    feedback: string[],
    points: number,
    question_image: (string | null)[] | null,
    feedback_images: (string | null)[] | null,  // Changed from feedback_embed
    feedback_videos: (string | null)[] | null   // Added video field
};

type ProcessedQuestion = Questions & {
    question_image_signed: (string | null)[],
    feedback_image_signed: (string | null)[],  // Separate image and video URLs
    feedback_video_signed: (string | null)[]
};

function getYouTubeId(url: string): string | null {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

const FeedbackMedia: React.FC<{ imageUrl?: string | null, videoUrl?: string | null }> = ({ imageUrl, videoUrl }) => {
    if (!imageUrl && !videoUrl) return null;

    // Handle YouTube videos
    const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;
    if (youtubeId) {
        return (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, margin: '10px 0' }}>
                <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    title="Feedback Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none'
                    }}
                />
            </div>
        );
    }

    // Handle direct video links
    if (videoUrl) {
        return (
            <video controls style={{ width: '320px', maxWidth: '100%', borderRadius: '4px' }}>
                <source src={videoUrl} />
                Your browser does not support the video tag.
            </video>
        );
    }

    // Handle images
    if (imageUrl) {
        return (
            <div style={{ margin: '10px 0' }}>
                <img
                    src={imageUrl}
                    alt="Feedback visual aid"
                    style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '4px'
                    }}
                />
            </div>
        );
    }

    return null;
};

const MyQuestionsComponent: React.FC<ClientComponentProps> = ({ instructor_id }) => {
    const [questions, setQuestions] = useState<ProcessedQuestion[]>([]);
    const supabase = createClient();

    useEffect(() => {
        initialize();
    }, []);

    async function initialize() {
        const { data: myQuestions, error } = await supabase
            .from('questions')
            .select(`
                question_id,
                question_body,
                solutions,
                feedback,
                points,
                question_image,
                feedback_images,
                feedback_videos
            `)
            .eq('creator_id', instructor_id);

        if (error) {
            console.error("Error retrieving questions:", error.message);
            return;
        }

        const BUCKET_NAME = 'question-images';
        const SIGNED_URL_EXPIRY = 60 * 10; // 10 minutes

        const processedQuestions = await Promise.all(
            (myQuestions as Questions[]).map(async (q) => {
                // Process question images
                const question_image_signed = await Promise.all(
                    [0, 1, 2, 3].map(async (version) => {
                        const path = q.question_image?.[version];
                        if (!path) return null;

                        const { data } = await supabase.storage
                            .from(BUCKET_NAME)
                            .createSignedUrl(path, SIGNED_URL_EXPIRY);

                        return data?.signedUrl || null;
                    })
                );

                // Process feedback images
                const feedback_image_signed = await Promise.all(
                    [0, 1, 2, 3].map(async (version) => {
                        const path = q.feedback_images?.[version];
                        if (!path) return null;

                        const { data } = await supabase.storage
                            .from(BUCKET_NAME)
                            .createSignedUrl(path, SIGNED_URL_EXPIRY);

                        return data?.signedUrl || null;
                    })
                );

                // Process feedback videos (direct URLs or YouTube)
                const feedback_video_signed = [0, 1, 2, 3].map(version => {
                    const url = q.feedback_videos?.[version];
                    return url ? url : null;
                });

                return {
                    ...q,
                    question_image_signed,
                    feedback_image_signed,
                    feedback_video_signed
                };
            })
        );

        setQuestions(processedQuestions);
    }

    async function deleteQuestion(id: number) {
        const { error: deletionError } = await supabase
            .from('questions')
            .delete()
            .eq('question_id', id);
        if (deletionError) {
            console.error("Error deleting question: ", deletionError.message)
            return null;
        } else {
            alert('Question Deleted Successfully')
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

            {/* Back to Dashboard */}
            <Link href={`/course-selection`} className="block w-fit mt-6 ml-6 outline-none text-gray-600 group">
                <ChevronLeft className="inline" strokeWidth={1} />
                <span className="align-middle group-hover:underline group-focus-visible:underline">Return to Course Selection</span>
            </Link>
            
            <main className="max-w-3xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-mono font-bold mb-8 text-lime-700">My Questions</h1>
                <ul className="space-y-8">
                    {questions.map((question) => (
                        <li key={question.question_id} className="bg-white border border-gray-200 rounded-xl shadow p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-mono font-semibold text-lg text-gray-800">
                                    Points: <span className="text-lime-700">{question.points}</span>
                                </h2>
                                <button
                                    onClick={() => deleteQuestion(question.question_id)}
                                    className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded px-3 py-1 text-sm shadow transition"
                                >
                                    Delete
                                </button>
                            </div>
                            <div className="space-y-6">
                                {[0, 1, 2, 3].map((version) => (
                                    <div
                                        key={version}
                                        className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-4"
                                    >
                                        <h3 className="font-mono font-bold text-base text-lime-700 mb-2">
                                            Version {version + 1}
                                        </h3>
                                        {/* Question Content */}
                                        <div className="mb-3">
                                            <span className="block font-semibold text-gray-700 mb-1">Question:</span>
                                            <p className="mb-2">{question.question_body[version]}</p>
                                            {question.question_image_signed[version] && (
                                                <img
                                                    src={question.question_image_signed[version]!}
                                                    alt="Question visual aid"
                                                    className="w-32 h-32 object-cover rounded border"
                                                />
                                            )}
                                        </div>
                                        {/* Answer */}
                                        <div className="mb-3">
                                            <span className="block font-semibold text-gray-700 mb-1">Answer:</span>
                                            <p>{question.solutions[version]}</p>
                                        </div>
                                        {/* Feedback Section */}
                                        <div>
                                            <span className="block font-semibold text-gray-700 mb-1">Feedback:</span>
                                            <p className="mb-2">{question.feedback[version]}</p>
                                            <FeedbackMedia
                                                imageUrl={question.feedback_image_signed[version]}
                                                videoUrl={question.feedback_video_signed[version]}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            </main>
        </>
    );
};

export default MyQuestionsComponent;

