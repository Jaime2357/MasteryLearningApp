'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface ClientComponentProps {
    instructor_id: string;
    course_id: string;
    assignment_id: string | null;
    onUpload?: (filePath: string) => void;
}

const YouTubeEmbed: React.FC<{ url: string }> = ({ url }) => {
    const videoId = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/)?.[1];

    return (
        <iframe
            width="560"
            height="315"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
    );
};

const QuestionCreatorComponent: React.FC<ClientComponentProps> = ({ instructor_id, course_id, assignment_id, onUpload = () => { } }) => {

    // Use the createClient function to initialize a Supabase client
    const supabase = createClient();
    const router = useRouter();

    // variables to store solutions
    const [questionBodies, setQuestions] = useState<string[]>(['', '', '', '']);
    const [solutions, setSolutions] = useState<string[]>(['', '', '', ''])
    const [points, setPoints] = useState<number>(0);
    const [feedbackBodies, setFeedback] = useState<string[]>(['', '', '', ''])

    // Image Uploading
    // Image-related state
    const [questionImages, setQuestionImages] = useState<string[]>(['', '', '', '']);
    const [uploading, setUploading] = useState<boolean[]>([false, false, false, false]);
    const [previewUrls, setPreviewUrls] = useState<string[]>(['', '', '', '']);
    const [feedbackImages, setFeedbackImages] = useState<string[]>(['', '', '', '']);
    const [feedbackImagePreviews, setFeedbackImagePreviews] = useState<string[]>(['', '', '', '']);
    const [feedbackVideos, setFeedbackVideos] = useState<string[]>(['', '', '', '']);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, versionIndex: number) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Update uploading state for this version
        const newUploading = [...uploading];
        newUploading[versionIndex] = true;
        setUploading(newUploading);

        // Create a unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_v${versionIndex + 1}_${Math.random().toString(36).substring(2, 15)}`;
        const filePath = `question_images/private/${fileName}.${fileExt}`;

        try {
            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from("question-images") // Use your actual bucket name
                .upload(filePath, file);

            if (error) throw error;

            // Update image paths state
            const newImagePaths = [...questionImages];
            newImagePaths[versionIndex] = filePath;
            setQuestionImages(newImagePaths);

            // Create preview URL
            const { data: urlData } = supabase.storage
                .from("question-images")
                .getPublicUrl(filePath);

            const newPreviewUrls = [...previewUrls];
            newPreviewUrls[versionIndex] = urlData.publicUrl;
            setPreviewUrls(newPreviewUrls);

            // Call the onUpload callback
            onUpload(filePath);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert(`Error uploading image for Version ${versionIndex + 1}`);
        } finally {
            // Reset uploading state
            const resetUploading = [...uploading];
            resetUploading[versionIndex] = false;
            setUploading(resetUploading);
        }
    };

    // Remove an image
    const removeImage = (versionIndex: number) => {
        const newImagePaths = [...questionImages];
        newImagePaths[versionIndex] = '';
        setQuestionImages(newImagePaths);

        const newPreviewUrls = [...previewUrls];
        newPreviewUrls[versionIndex] = '';
        setPreviewUrls(newPreviewUrls);
    };

    async function createQuestion() {

        const newQuestion = {
            question_body: questionBodies,
            points: points,
            solutions: solutions,
            feedback: feedbackBodies,
            creator_id: instructor_id,
            question_image: questionImages,
            feedback_images: feedbackImages,
            feedback_videos: feedbackVideos
        }
        const { data: verif, error: questionCreationError } = await supabase
            .from('questions')
            .insert([newQuestion])
            .select()
            .single();

        console.log("Inserted Question: ", verif);

        if (questionCreationError) {
            console.error("Problem Creating New Question");
        }
        else {
            alert("success");
            router.push(`/assignment-editor/${course_id}/${assignment_id}`)
        }
    }

    // Helper Function to update question body input
    const saveQuestionBody = (questionBody: string, index: number) => {
        setQuestions((prev) => {
            const newQuestionBodies = [...prev];
            newQuestionBodies[index] = questionBody;
            return newQuestionBodies;
        });
    };

    // Helper Function to update solution input
    const saveSolution = (solution: string, index: number) => {
        setSolutions((prev) => {
            const newSolutions = [...prev];
            newSolutions[index] = solution;
            return newSolutions;
        });
    };

    // Helper Function to update feedback input
    const saveFeedback = (feedback: string, index: number) => {
        setFeedback((prev) => {
            const newFeedbackBodies = [...prev];
            newFeedbackBodies[index] = feedback;
            return newFeedbackBodies;
        });
    };

    const handleFeedbackImageChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
        versionIndex: number
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_feedback_v${versionIndex + 1}_${Math.random().toString(36).substring(2, 15)}`;
        const filePath = `feedback_images/private/${fileName}.${fileExt}`;

        try {
            const { error } = await supabase.storage
                .from("question-images")
                .upload(filePath, file);

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from("question-images")
                .getPublicUrl(filePath);

            setFeedbackImages(prev => {
                const newArr = [...prev];
                newArr[versionIndex] = filePath;
                return newArr;
            });

            setFeedbackImagePreviews(prev => {
                const newArr = [...prev];
                newArr[versionIndex] = urlData.publicUrl;
                return newArr;
            });
        } catch (error) {
            console.error("Feedback image upload failed:", error);
        }
    };

    const handleVideoUrlChange = (url: string, versionIndex: number) => {
        setFeedbackVideos(prev => {
            const newArr = [...prev];
            newArr[versionIndex] = url;
            return newArr;
        });
    };

    // Render a version block with its image upload controls
    const renderVersionBlock = (versionIndex: number) => (
        <div key={versionIndex} className="version-block" style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "8px" }}>
            <h1>Version {versionIndex + 1}</h1>

            <h2>Question:</h2>
            <input
                type="text"
                value={questionBodies[versionIndex]}
                onChange={(e) => saveQuestionBody(e.target.value, versionIndex)}
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />

            <div className="image-upload-section" style={{ marginBottom: "15px" }}>
                <h3>Question Image (Optional):</h3>
                <input
                    type="file"
                    accept="image/*"
                    disabled={uploading[versionIndex]}
                    onChange={(e) => handleFileChange(e, versionIndex)}
                />

                {uploading[versionIndex] && (
                    <p>Uploading image...</p>
                )}

                {previewUrls[versionIndex] && (
                    <div className="image-preview" style={{ marginTop: "10px" }}>
                        <img
                            src={previewUrls[versionIndex]}
                            alt={`Question ${versionIndex + 1} image`}
                            style={{ maxWidth: "200px", maxHeight: "200px" }}
                        />
                        <button
                            onClick={() => removeImage(versionIndex)}
                            style={{ marginLeft: "10px" }}
                        >
                            Remove Image
                        </button>
                    </div>
                )}
            </div>

            <h2>Solution:</h2>
            <input
                type="text"
                value={solutions[versionIndex]}
                onChange={(e) => saveSolution(e.target.value, versionIndex)}
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />

            <h2>Feedback:</h2>
            <input
                type="text"
                value={feedbackBodies[versionIndex]}
                onChange={(e) => saveFeedback(e.target.value, versionIndex)}
                style={{ width: "100%", padding: "8px" }}
            />

            <div className="feedback-media-section">
                <h3>Feedback Media:</h3>

                {/* Image Upload */}
                <div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFeedbackImageChange(e, versionIndex)}
                    />
                    {feedbackImagePreviews[versionIndex] && (
                        <img
                            src={feedbackImagePreviews[versionIndex]}
                            alt={`Feedback preview v${versionIndex + 1}`}
                            className="preview-image"
                        />
                    )}
                </div>

                {/* Video URL Input */}
                <input
                    type="text"
                    placeholder="Paste YouTube or video URL"
                    value={feedbackVideos[versionIndex]}
                    onChange={(e) => handleVideoUrlChange(e.target.value, versionIndex)}
                    className="video-url-input"
                />

                {/* Video Preview */}
                {feedbackVideos[versionIndex] && (
                    <div className="video-preview">
                        {feedbackVideos[versionIndex].includes('youtube') ? (
                            <YouTubeEmbed url={feedbackVideos[versionIndex]} />
                        ) : (
                            <video controls src={feedbackVideos[versionIndex]} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
            <Link href={`/assignment-editor/${course_id}/${assignment_id}`}>
                ← Back to assignment
            </Link>

            <h1>New Question:</h1>

            <div style={{ margin: "20px 0" }}>
                <h3>Points:</h3>
                <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    style={{ padding: "8px", width: "100px" }}
                />
            </div>

            {/* Render the four version blocks */}
            {[0, 1, 2, 3].map(index => renderVersionBlock(index))}

            <button
                onClick={createQuestion}
                style={{
                    padding: "10px 20px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "16px",
                    marginTop: "20px"
                }}
            >
                Save Question
            </button>
        </div>
    );
};

export default QuestionCreatorComponent;