'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    const supabase = createClient();
    const router = useRouter();

    // New: Question type state
    const [questionType, setQuestionType] = useState<'FRQ' | 'MCQ'>('FRQ');

    const [questionBodies, setQuestions] = useState<string[]>(['', '', '', '']);
    const [solutions, setSolutions] = useState<string[]>(['', '', '', '']);
    const [points, setPoints] = useState<number>(0);
    const [feedbackBodies, setFeedback] = useState<string[]>(['', '', '', '']);
    const [mcqOptions, setMcqOptions] = useState<string[][]>(
        Array(4).fill(0).map(() => Array(4).fill(''))
    );

    // Image Uploading
    const [questionImages, setQuestionImages] = useState<string[]>(['', '', '', '']);
    const [uploading, setUploading] = useState<boolean[]>([false, false, false, false]);
    const [previewUrls, setPreviewUrls] = useState<string[]>(['', '', '', '']);
    const [feedbackImages, setFeedbackImages] = useState<string[]>(['', '', '', '']);
    const [feedbackImagePreviews, setFeedbackImagePreviews] = useState<string[]>(['', '', '', '']);
    const [feedbackVideos, setFeedbackVideos] = useState<string[]>(['', '', '', '']);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, versionIndex: number) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const newUploading = [...uploading];
        newUploading[versionIndex] = true;
        setUploading(newUploading);

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_v${versionIndex + 1}_${Math.random().toString(36).substring(2, 15)}`;
        const filePath = `question_images/private/${fileName}.${fileExt}`;

        try {
            const { error } = await supabase.storage
                .from("question-images")
                .upload(filePath, file);
            if (error) throw error;

            const newImagePaths = [...questionImages];
            newImagePaths[versionIndex] = filePath;
            setQuestionImages(newImagePaths);

            const { data: urlData } = supabase.storage
                .from("question-images")
                .getPublicUrl(filePath);

            const newPreviewUrls = [...previewUrls];
            newPreviewUrls[versionIndex] = urlData.publicUrl;
            setPreviewUrls(newPreviewUrls);

            onUpload(filePath);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert(`Error uploading image for Version ${versionIndex + 1}`);
        } finally {
            const resetUploading = [...uploading];
            resetUploading[versionIndex] = false;
            setUploading(resetUploading);
        }
    };

    const removeImage = (versionIndex: number) => {
        const newImagePaths = [...questionImages];
        newImagePaths[versionIndex] = '';
        setQuestionImages(newImagePaths);

        const newPreviewUrls = [...previewUrls];
        newPreviewUrls[versionIndex] = '';
        setPreviewUrls(newPreviewUrls);
    };

    const validateQuestion = () => {
        if (questionType === 'MCQ') {
            for (let versionIndex = 0; versionIndex < 4; versionIndex++) {
                const validOptions = mcqOptions[versionIndex].filter(opt => opt.trim() !== '');
                
                // Validate minimum options
                if (validOptions.length < 2) {
                    alert(`Version ${versionIndex + 1} needs at least 2 options`);
                    return false;
                }

                // Validate no empty options between filled ones
                let foundEmpty = false;
                for (const option of mcqOptions[versionIndex]) {
                    if (option.trim() === '') {
                        foundEmpty = true;
                    } else if (foundEmpty) {
                        alert(`Version ${versionIndex + 1} has empty options between filled ones`);
                        return false;
                    }
                }

                // Validate solution selection
                const selectedSolution = solutions[versionIndex];
                if (!selectedSolution || parseInt(selectedSolution) >= validOptions.length) {
                    alert(`Please select a valid solution for Version ${versionIndex + 1}`);
                    return false;
                }
            }
        }
        return true;
    };

    const handleMcqOptionChange = (value: string, versionIndex: number, optionIndex: number) => {
        setMcqOptions(prev => {
            const newOptions = [...prev];
            newOptions[versionIndex] = [...newOptions[versionIndex]];
            newOptions[versionIndex][optionIndex] = value;

            // Clear subsequent options when emptying a middle option
            if (value.trim() === '' && optionIndex < 3) {
                for (let i = optionIndex + 1; i < 4; i++) {
                    newOptions[versionIndex][i] = '';
                }
            }
            return newOptions;
        });
    };

    const addMcqOption = (versionIndex: number) => {
        setMcqOptions(prev => {
            const newOptions = [...prev];
            const firstEmptyIndex = newOptions[versionIndex].findIndex(opt => opt.trim() === '');
            if (firstEmptyIndex !== -1) {
                newOptions[versionIndex][firstEmptyIndex] = ' ';
            }
            return newOptions;
        });
    };

    const removeMcqOption = (versionIndex: number, optionIndex: number) => {
        setMcqOptions(prev => {
            const newOptions = [...prev];
            newOptions[versionIndex] = newOptions[versionIndex].map((opt, idx) => 
                idx >= optionIndex ? '' : opt
            );
            return newOptions;
        });

        setSolutions(prev => {
            const newSolutions = [...prev];
            if (parseInt(newSolutions[versionIndex]) >= optionIndex) {
                newSolutions[versionIndex] = '';
            }
            return newSolutions;
        });
    };

    async function createQuestion() {
        if (!validateQuestion()) return;
        const newQuestion = {
            question_body: questionBodies,
            points: points,
            solutions: solutions,
            feedback: feedbackBodies,
            creator_id: instructor_id,
            question_image: questionImages,
            feedback_images: feedbackImages,
            feedback_videos: feedbackVideos,
            MCQ_options: questionType === 'MCQ' ? mcqOptions : null
        };
        const { error: questionCreationError } = await supabase
            .from('questions')
            .insert([newQuestion])
            .select()
            .single();

        if (questionCreationError) {
            console.error("Problem Creating New Question: ", questionCreationError.message);
        } else {
            alert("success");
            router.push(`/assignment-editor/${course_id}/${assignment_id}`);
        }
    }

    const saveQuestionBody = (questionBody: string, index: number) => {
        setQuestions((prev) => {
            const newQuestionBodies = [...prev];
            newQuestionBodies[index] = questionBody;
            return newQuestionBodies;
        });
    };

    // New: For MCQ, save the index as string; for FRQ, save the text
    const saveSolution = (solution: string, index: number) => {
        setSolutions((prev) => {
            const newSolutions = [...prev];
            newSolutions[index] = solution;
            return newSolutions;
        });
    };

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

    // --- UI for each version ---
    const renderVersionBlock = (versionIndex: number) => {
        const currentOptions = mcqOptions[versionIndex];
        const validOptions = currentOptions.filter(opt => opt.trim() !== '');
        const showAddButton = validOptions.length < 4 && currentOptions[validOptions.length] === '';

        return (
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

                {uploading[versionIndex] && (<p>Uploading image...</p>)}

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

            {questionType === 'MCQ' && (
                    <div className="mcq-options-section" style={{ marginBottom: "15px" }}>
                        <h2>Multiple Choice Options:</h2>
                        {currentOptions.map((option, optionIndex) => {
                            if (optionIndex > 0 && currentOptions[optionIndex - 1].trim() === '') return null;
                            
                            return (
                                <div key={optionIndex} style={{ marginBottom: '10px', position: 'relative' }}>
                                    <label>Option {optionIndex + 1}:</label>
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => handleMcqOptionChange(e.target.value, versionIndex, optionIndex)}
                                        style={{ width: "100%", padding: "8px" }}
                                        required={optionIndex < 2}
                                    />
                                    {optionIndex > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeMcqOption(versionIndex, optionIndex)}
                                            style={{
                                                position: 'absolute',
                                                right: -40,
                                                top: 27,
                                                background: 'none',
                                                border: 'none',
                                                color: '#ff4444',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        {showAddButton && (
                            <button
                                type="button"
                                onClick={() => addMcqOption(versionIndex)}
                                style={{ marginTop: '10px', padding: '5px 10px' }}
                            >
                                + Add Option
                            </button>
                        )}
                    </div>
                )}

                <h2>Solution:</h2>
                {questionType === 'MCQ' ? (
                    <select
                        value={solutions[versionIndex]}
                        onChange={e => saveSolution(e.target.value, versionIndex)}
                        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
                        required
                    >
                        <option value="">Select correct option</option>
                        {validOptions.map((opt, idx) => (
                            <option key={idx} value={String(idx)}>
                                Option {idx + 1}: {opt}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        type="text"
                        value={solutions[versionIndex]}
                        onChange={(e) => saveSolution(e.target.value, versionIndex)}
                        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
                    />
                )}


            <h2>Feedback:</h2>
            <input
                type="text"
                value={feedbackBodies[versionIndex]}
                onChange={(e) => saveFeedback(e.target.value, versionIndex)}
                style={{ width: "100%", padding: "8px" }}
            />

            <div className="feedback-media-section">
                <h3>Feedback Media:</h3>
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
                <input
                    type="text"
                    placeholder="Paste YouTube or video URL"
                    value={feedbackVideos[versionIndex]}
                    onChange={(e) => handleVideoUrlChange(e.target.value, versionIndex)}
                    className="video-url-input"
                />
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
        </div>)};


    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
            <Link href={`/assignment-editor/${course_id}/${assignment_id}`}>
                ← Back to assignment
            </Link>

            <h1>New Question:</h1>

            <h3> Points: </h3>
            <input
            type='number'
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            />

            {/* Question type selector */}
            <div style={{ margin: "20px 0" }}>
                <h3>Question Type:</h3>
                <div>
                    <label style={{ marginRight: '15px' }}>
                        <input
                            type="radio"
                            name="questionType"
                            value="FRQ"
                            checked={questionType === 'FRQ'}
                            onChange={() => {
                                setQuestionType('FRQ');
                                setSolutions(['', '', '', '']);
                            }}
                        /> Free Response
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="questionType"
                            value="MCQ"
                            checked={questionType === 'MCQ'}
                            onChange={() => {
                                setQuestionType('MCQ');
                                setSolutions(['', '', '', '']);
                            }}
                        /> Multiple Choice
                    </label>
                </div>
            </div>

            {/* Points input and version blocks */}
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