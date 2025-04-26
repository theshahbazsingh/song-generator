import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { OpenAI } from 'openai';
import './App.css';

function App() {
  // State for questionnaire
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [learningType, setLearningType] = useState('');
  const [musicGenre, setMusicGenre] = useState('');
  
  // State for app functionality
  const [lyrics, setLyrics] = useState('');
  const [songUrl, setSongUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [songGenerationId, setSongGenerationId] = useState('');

  // OpenAI client instance
  const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true // Needed for client-side usage
  });

  // Example topics for each subject
  const mathTopics = [
    "Whole Numbers",
    "Integers",
    "Exponents",
    "Numeric and Geometric Patterns",
    "Functions and Relationships",
    "Algebraic Expressions",
    "Algebraic Equations",
    "Constructions of Geometric Figures"
  ];

  const scienceTopics = [
    "Matter & classification",
    "Kinetic theory",
    "Atoms",
    "Chemical bonding",
    "Particles substances are made of",
    "Waves: Basics",
    "Electromagnetic radiation",
    "Physical and chemical change"
  ];

  // Questions array
  const questions = [
    { id: 'welcome', text: "Welcome, let's explore together AI assisted learning in a fun way!" },
    { id: 'name', text: "What is your name?" },
    { id: 'age', text: "What is your age?" },
    { id: 'grade', text: "What grade are you in?" },
    { id: 'subject', text: "What subject are you interested in? Math or Science?" },
    { id: 'topic', text: "What topic would you like to learn about?" },
    { id: 'learningType', text: "Would you like to have flash cards or a song?" },
    { id: 'musicGenre', text: "What type of music genre do you prefer? Pop, Hip hop, Rock, or Soul?" }
  ];

  // Generate lyrics using OpenAI SDK
  const generateLyrics = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Create a prompt for OpenAI based on user inputs
      const instructionsPrompt = `
You are an educational songwriting assistant created by Inaaya Zia.
Create educational song lyrics about ${topic} in ${subject} for a grade ${grade} student named ${name}.
The song should be in ${musicGenre} style.
The lyrics should be informative, accurate, and easy to remember.
Include verses, chorus, and bridge sections.
Make it catchy and fun while ensuring all important educational content about ${topic} is covered.
Format the output with clear section labels (Verse 1, Chorus, etc.).
      `;
      
      // Using OpenAI SDK to call the API
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an educational songwriting assistant that creates informative and catchy lyrics to help students learn academic subjects."
          },
          {
            role: "user",
            content: instructionsPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });
      
      // Extract lyrics from the response
      const generatedLyrics = completion.choices[0].message.content;
      setLyrics(generatedLyrics);
      
    } catch (err) {
      console.error('Error generating lyrics:', err);
      setError('Failed to generate lyrics: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Send lyrics to the song generation API
  const generateSong = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Create a title from the subject and topic
      const songTitle = `${subject} - ${topic} Learning Song`;
      
      // Create data object for the song generation API based on documentation
      const songData = {
        prompt: lyrics,                  // Using our generated lyrics as the prompt (will be exact lyrics)
        style: musicGenre,               // The music style/genre
        title: songTitle,                // Title of the track
        customMode: true,                // Using custom mode since we have specific lyrics
        instrumental: false,             // We want vocals for our educational songs
        model: "V3_5",                   // Using V3_5 model
        negativeTags: "Explicit language, Inappropriate content",
        callBackUrl: window.location.origin + "/callback"  // Using current origin with /callback
      };
      
      // Log the request data for debugging
      console.log("Song generation request:", songData);
      
      // Step 1: Initiate song generation with the API
      const createResponse = await axios.post(
        'https://apibox.erweima.ai/api/v1/generate',
        songData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_SUNO_API_KEY}`
          }
        }
      );
      
      console.log("API response:", createResponse.data);
      
      // Check if the API request was successful
      if (createResponse.data.code !== 200) {
        throw new Error(`API Error: ${createResponse.data.msg || 'Unknown error'}`);
      }
      
      // Store the task ID for polling - adjust based on actual response structure
      const taskId = createResponse.data.data?.task_id || createResponse.data.data?.id;
      setSongGenerationId(taskId);
      
      // Step 2: Poll for song generation completion
      const checkSongStatus = async () => {
        try {
          const statusResponse = await axios.get(
            `https://apibox.erweima.ai/api/v1/task/${taskId}`,
            {
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${process.env.REACT_APP_SUNO_API_KEY}`
              }
            }
          );
          
          console.log("Status response:", statusResponse.data);
          
          // Check if the status API request was successful
          if (statusResponse.data.code !== 200) {
            throw new Error(`Status API Error: ${statusResponse.data.msg || 'Unknown error'}`);
          }
          
          // Extract status from response - adjust based on actual response structure
          const status = statusResponse.data.data?.status;
          
          if (status === 'completed' || status === 'complete') {
            // Song is ready, get the URL
            // The structure here depends on the actual API response
            const audioUrl = statusResponse.data.data?.data?.[0]?.audio_url || 
                            statusResponse.data.data?.audio_url;
                            
            if (!audioUrl) {
              throw new Error('No audio URL found in the completed response');
            }
            
            setSongUrl(audioUrl);
            setIsLoading(false);
          } else if (status === 'failed' || status === 'error') {
            setError('Song generation failed. Please try again.');
            setIsLoading(false);
          } else {
            // Still processing, check again after delay
            setTimeout(checkSongStatus, 5000); // Poll every 5 seconds
          }
        } catch (err) {
          console.error('Error checking song status:', err);
          setError('Failed to check song status: ' + (err.message || 'Unknown error'));
          setIsLoading(false);
        }
      };
      
      // Start polling
      checkSongStatus();
      
    } catch (err) {
      console.error('Error initiating song generation:', err);
      setError('Failed to start song generation. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle song generation after lyrics are created
  useEffect(() => {
    if (lyrics && step === 8 && !songUrl && !isLoading) {
      generateSong();
    }
  }, [lyrics, step, songUrl, isLoading]);

  // Handle next step in questionnaire
  const handleNext = () => {
    // Validate current step
    if (step === 1 && !name) {
      setError('Please enter your name');
      return;
    } else if (step === 2 && !age) {
      setError('Please enter your age');
      return;
    } else if (step === 3 && !grade) {
      setError('Please enter your grade');
      return;
    } else if (step === 4 && !subject) {
      setError('Please select a subject');
      return;
    } else if (step === 5 && !topic) {
      setError('Please select a topic');
      return;
    } else if (step === 6 && !learningType) {
      setError('Please select flash cards or song');
      return;
    } else if (step === 7 && learningType === 'song' && !musicGenre) {
      setError('Please select a music genre');
      return;
    }
    
    setError('');
    
    // If we're at the end of questions and selected "song", generate lyrics
    if (step === 7 && learningType === 'song') {
      generateLyrics();
    }
    
    // Move to next step
    setStep(step + 1);
  };

  // Handle previous step in questionnaire
  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="App">
      <div className="app-container">
        <header className="app-header">
          <h1>Educational Song Generator</h1>
          <p>Learn through music!</p>
        </header>

        <main className="app-main">
          {/* Questionnaire Section */}
          {step < 8 && (
            <div className="question-panel">
              {step === 0 && (
                <div className="welcome-screen">
                  <h2>{questions[step].text}</h2>
                  <p>Designed by Inaaya Zia</p>
                  <button 
                    onClick={handleNext}
                    className="primary-button"
                  >
                    Let's Start!
                  </button>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2>{questions[step].text}</h2>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    placeholder="Enter your name"
                  />
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2>{questions[step].text}</h2>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="input-field"
                    placeholder="Enter your age"
                    min="5"
                    max="18"
                  />
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2>{questions[step].text}</h2>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select your grade</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                  </select>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h2>{questions[step].text}</h2>
                  <div className="button-group">
                    <button
                      onClick={() => setSubject('Math')}
                      className={`option-button ${subject === 'Math' ? 'selected' : ''}`}
                    >
                      Math
                    </button>
                    <button
                      onClick={() => setSubject('Science')}
                      className={`option-button ${subject === 'Science' ? 'selected' : ''}`}
                    >
                      Science
                    </button>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div>
                  <h2>{questions[step].text}</h2>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select a topic</option>
                    {subject === 'Math' && 
                      mathTopics.map((t, i) => (
                        <option key={i} value={t}>{t}</option>
                      ))
                    }
                    {subject === 'Science' && 
                      scienceTopics.map((t, i) => (
                        <option key={i} value={t}>{t}</option>
                      ))
                    }
                  </select>
                </div>
              )}

              {step === 6 && (
                <div>
                  <h2>{questions[step].text}</h2>
                  <div className="button-group">
                    <button
                      onClick={() => setLearningType('flashcard')}
                      className={`option-button ${learningType === 'flashcard' ? 'selected' : ''}`}
                    >
                      Flash Cards
                    </button>
                    <button
                      onClick={() => setLearningType('song')}
                      className={`option-button ${learningType === 'song' ? 'selected' : ''}`}
                    >
                      Song
                    </button>
                  </div>
                </div>
              )}

              {step === 7 && learningType === 'song' && (
                <div>
                  <h2>{questions[step].text}</h2>
                  <div className="genre-grid">
                    {['Pop', 'Hip hop', 'Rock', 'Soul'].map((genre) => (
                      <button
                        key={genre}
                        onClick={() => setMusicGenre(genre)}
                        className={`genre-button ${musicGenre === genre ? 'selected' : ''}`}
                      >
                        <span>{genre}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="error-message">{error}</p>}

              <div className="navigation-buttons">
                {step > 0 && (
                  <button
                    onClick={handleBack}
                    className="secondary-button"
                  >
                    Back
                  </button>
                )}
                {step === 0 ? null : (
                  <button
                    onClick={handleNext}
                    className="primary-button"
                  >
                    {step === 7 ? 'Generate' : 'Next'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results Section - Lyrics */}
          {step === 8 && lyrics && !songUrl && (
            <div className="results-panel">
              <h2>Your Educational Lyrics</h2>
              <div className="lyrics-container">
                {lyrics}
              </div>
              
              {isLoading ? (
                <div className="loading-container">
                  <p>
                    {songGenerationId ? 'Creating your song with Suno...' : 'Generating your lyrics with AI...'}
                  </p>
                  <div className="loading-animation">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                  {songGenerationId && (
                    <p className="loading-note">
                      Song generation may take 1-2 minutes. Please wait...
                    </p>
                  )}
                </div>
              ) : (
                <div className="navigation-buttons">
                  <button
                    onClick={handleBack}
                    className="secondary-button"
                  >
                    Back
                  </button>
                  <button
                    onClick={generateSong}
                    className="primary-button"
                  >
                    Generate Song
                  </button>
                </div>
              )}
              
              {error && (
                <div className="error-container">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Results Section - Song */}
          {step === 8 && songUrl && (
            <div className="results-panel">
              <h2>Your Educational Song</h2>
              
              <div className="lyrics-section">
                <h3>Lyrics:</h3>
                <div className="lyrics-container">
                  {lyrics}
                </div>
              </div>
              
              <div className="audio-section">
                <h3>Listen to Your Song:</h3>
                <div className="audio-container">
                  <audio controls className="audio-player">
                    <source src={songUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
              
              <div className="navigation-buttons">
                <button
                  onClick={() => setStep(0)}
                  className="secondary-button"
                >
                  Start Over
                </button>
                <a
                  href={songUrl}
                  download={`${name}_${subject}_${topic}_song.mp3`}
                  className="primary-button"
                >
                  Download Song
                </a>
              </div>
            </div>
          )}

          {/* Flash Card Section */}
          {step === 8 && learningType === 'flashcard' && (
            <div className="results-panel">
              <h2>Flash Cards Feature</h2>
              <p>Flash card functionality would be implemented here.</p>
              <p className="development-note">This feature is currently in development.</p>
              
              <button
                onClick={() => setStep(0)}
                className="primary-button"
              >
                Start Over
              </button>
            </div>
          )}
        </main>

        <footer className="app-footer">
          <p>Educational Song Generator - Designed for student learning</p>
          <p>Created by Inaaya Zia</p>
        </footer>
      </div>
    </div>
  );
}

export default App;