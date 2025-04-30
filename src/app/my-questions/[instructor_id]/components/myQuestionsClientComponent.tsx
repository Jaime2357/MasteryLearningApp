'use client';

import { createClient } from "@/utils/supabase/client";
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
        <div>
            {questions.map((question) => (
                <li key={question.question_id} style={{ marginBottom: 32 }}>
                    <h2>Points: {question.points}</h2>
                    <button onClick={() => deleteQuestion(question.question_id)}>Delete</button>

                    {[0, 1, 2, 3].map((version) => (
                        <div key={version}>
                            <h3>Version {version + 1}</h3>
                            
                            {/* Question Content */}
                            <div>
                                <h4>Question:</h4>
                                <p>{question.question_body[version]}</p>
                                {question.question_image_signed[version] && (
                                    <img
                                        src={question.question_image_signed[version]!}
                                        alt={`Question visual aid`}
                                        style={{ width: 120, height: 120, objectFit: 'cover' }}
                                    />
                                )}
                            </div>

                            {/* Answer */}
                            <div>
                                <h4>Answer:</h4>
                                <p>{question.solutions[version]}</p>
                            </div>

                            {/* Feedback Section */}
                            <div>
                                <h4>Feedback:</h4>
                                <p>{question.feedback[version]}</p>
                                <FeedbackMedia 
                                    imageUrl={question.feedback_image_signed[version]}
                                    videoUrl={question.feedback_video_signed[version]}
                                />
                            </div>
                            <hr style={{ margin: '20px 0' }} />
                        </div>
                    ))}
                </li>
            ))}
        </div>
    );
};

export default MyQuestionsComponent;

