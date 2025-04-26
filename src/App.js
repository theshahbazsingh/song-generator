import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [error, setError] = useState('');
  const [songGenerationId, setSongGenerationId] = useState('');
  const [hasAttemptedSongGeneration, setHasAttemptedSongGeneration] = useState(false);
  const [pollingStatus, setPollingStatus] = useState('');
  
  // Update document title on component mount
  useEffect(() => {
    document.title = "Learn Through Music | Educational Song Generator";
  }, []);
  
  // Refs for form inputs to enable keyboard navigation
  const inputRefs = {
    name: useRef(null),
    age: useRef(null),
    grade: useRef(null),
    topic: useRef(null)
  };

  // Max retries for API calls
  const MAX_RETRIES = 3;
  const POLLING_INTERVAL = 5000; // 5 seconds

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

  // Handle keypress events for navigation
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !isLoading && !lyricsLoading) {
      handleNext();
    }
  }, [step, name, age, grade, subject, topic, learningType, musicGenre, isLoading, lyricsLoading]);

  // Set up key listeners for each step
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    
    // Focus the appropriate input field based on the current step
    if (step === 1 && inputRefs.name.current) {
      inputRefs.name.current.focus();
    } else if (step === 2 && inputRefs.age.current) {
      inputRefs.age.current.focus();
    } else if (step === 3 && inputRefs.grade.current) {
      inputRefs.grade.current.focus();
    } else if (step === 5 && inputRefs.topic.current) {
      inputRefs.topic.current.focus();
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [step, handleKeyPress]);

  // Generate lyrics using OpenAI SDK
  const generateLyrics = async () => {
    setLyricsLoading(true);
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
      setError(`Failed to generate lyrics: ${err.message || 'Unknown error occurred'}. Please try again.`);
    } finally {
      setLyricsLoading(false);
    }
  };

  // Send lyrics to the song generation API
  const generateSong = async () => {
    setIsLoading(true);
    setError('');
    setPollingStatus('Preparing to create your song...');
    setHasAttemptedSongGeneration(true); // Mark that we've tried to generate a song
    
    try {
      // Create a title from the subject and topic
      const songTitle = `${subject} - ${topic} Learning Song`;
      
      // Create data object for the song generation API
      const songData = {
        prompt: lyrics,                  
        style: musicGenre,               
        title: songTitle,                
        customMode: true,                
        instrumental: false,             
        model: "V3_5",                   
        negativeTags: "Explicit language, Inappropriate content",
        callBackUrl: window.location.origin + "/callback"  
      };
      
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
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log("API response:", createResponse.data);
      
      // Check if the API request was successful
      if (createResponse.data.code !== 200) {
        throw new Error(`API Error: ${createResponse.data.msg || 'Unknown error'}`);
      }
      
      // Extract the task ID - check ALL possible formats from API response
      // The API seems to return taskId (camelCase) but our code was looking for task_id (snake_case)
      const taskId = createResponse.data.data?.taskId || 
                     createResponse.data.data?.task_id || 
                     createResponse.data.data?.id;
      
      if (!taskId) {
        throw new Error('No task ID found in API response. The song might still be generating. Check the Suno dashboard before trying again.');
      }
      
      setSongGenerationId(taskId);
      setPollingStatus('Song generation started. Creating your educational song...');
      
      // Start polling for completion
      pollSongStatus(taskId, 0);
      
    } catch (err) {
      console.error('Error initiating song generation:', err);
      
      // Detect rate limiting issues
      const isRateLimited = 
        (err.response && err.response.status === 429) || 
        (err.message && err.message.includes('frequency is too high')) ||
        (err.message && err.message.includes('rate limit')) ||
        (err.message && err.message.toLowerCase().includes('too many requests'));
      
      // Set appropriate error message based on error type
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        setError('Connection timeout. The server is taking too long to respond. Please try again later.');
      } else if (isRateLimited) {
        setError('The Suno API is currently busy. Please wait a few minutes and try again.');
      } else if (err.response && err.response.status === 401) {
        setError('Authentication failed. Please check your API credentials.');
      } else if (err.message.includes('No task ID')) {
        setError('Your song request was sent, but we couldn\'t get a confirmation. Please check the Suno dashboard before trying again to avoid duplicate songs.');
      } else {
        setError(`Failed to start song generation: ${err.message || 'Unknown error'}. Please try again after a few minutes.`);
      }
      
      // Always end loading state on error - no retries
      setIsLoading(false);
    }
  };

  // Poll for song generation completion
  const pollSongStatus = async (taskId, attempt = 0) => {
    // Safety check to prevent infinite polling
    if (attempt > 60) { // Stop after 5 minutes (60 * 5s = 300s = 5min)
      setError('Song generation is taking longer than expected. The song might still be generating. Please check Suno dashboard or try again later.');
      setIsLoading(false);
      return;
    }
    
    try {
      setPollingStatus(`Checking song status... (Attempt ${attempt + 1})`);
      
      // Use the correct endpoint for checking task status as per the Suno API documentation
      const statusResponse = await axios.get(
        `https://apibox.erweima.ai/api/v1/generate/record-info`, 
        {
          params: { taskId: taskId },
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_SUNO_API_KEY}`
          },
          timeout: 10000 // 10 second timeout for status checks
        }
      );
      
      console.log("Status response:", statusResponse.data);
      
      // Check if the API request was successful
      if (statusResponse.data.code !== 200) {
        throw new Error(`Status API Error: ${statusResponse.data.msg || 'Unknown error'}`);
      }
      
      // Extract status from response - based on the actual response structure from the logs
      const status = statusResponse.data.data?.status;
      
      if (status === 'SUCCESS') {
        // Based on the error log, the audio URLs are in data.response.sunoData
        let audioUrl = null;
        
        // Check if sunoData exists and has items
        if (statusResponse.data.data?.response?.sunoData && 
            Array.isArray(statusResponse.data.data.response.sunoData) && 
            statusResponse.data.data.response.sunoData.length > 0) {
          
          // Get the first item's audioUrl - this is the correct path based on the error log
          audioUrl = statusResponse.data.data.response.sunoData[0]?.audioUrl;
          
          console.log("Found audio URL:", audioUrl);
        }
        
        // Fallbacks in case the structure is different
        if (!audioUrl) {
          // Try other possible locations
          if (statusResponse.data.data?.audioUrl) {
            audioUrl = statusResponse.data.data.audioUrl;
          } else if (statusResponse.data.data?.response?.audioUrl) {
            audioUrl = statusResponse.data.data.response.audioUrl;
          } else if (statusResponse.data.data?.response?.results && 
                   Array.isArray(statusResponse.data.data.response.results) && 
                   statusResponse.data.data.response.results.length > 0) {
            audioUrl = statusResponse.data.data.response.results[0]?.audioUrl || 
                      statusResponse.data.data.response.results[0]?.audio_url;
          }
        }
        
        if (!audioUrl) {
          console.error("Could not find audio URL in response:", statusResponse.data);
          throw new Error('No audio URL found in the completed response. Your song may have been generated but the URL is unavailable. Please check the Suno dashboard.');
        }
        
        setSongUrl(audioUrl);
        setIsLoading(false);
        setPollingStatus('');
      } else if (status === 'CREATE_TASK_FAILED' || status === 'GENERATE_AUDIO_FAILED' || 
                 status === 'CALLBACK_EXCEPTION' || status === 'SENSITIVE_WORD_ERROR') {
        // These are error statuses according to the documentation
        const errorMessage = statusResponse.data.data?.errorMessage || 'Song generation failed';
        setError(`Song creation error: ${errorMessage}. Please try again.`);
        setIsLoading(false);
        setPollingStatus('');
      } else if (status === 'PENDING' || status === 'TEXT_SUCCESS' || status === 'FIRST_SUCCESS') {
        // These are intermediate statuses according to the documentation
        // Map the status to a user-friendly message - make it more intuitive without technical details
        let statusMessage = 'Creating your song...';
        let progressPercentage = 25;
        
        if (status === 'PENDING') {
          statusMessage = `Starting to create your song...`;
          progressPercentage = 25;
        } else if (status === 'TEXT_SUCCESS') {
          statusMessage = `Working on your ${musicGenre} song about ${topic}...`;
          progressPercentage = 50;
        } else if (status === 'FIRST_SUCCESS') {
          statusMessage = `Almost done! Putting the finishing touches on your song...`;
          progressPercentage = 75;
        }
        
        setPollingStatus(`${statusMessage} (${progressPercentage}% complete)`);
        
        // Still processing, check again after delay
        setTimeout(() => pollSongStatus(taskId, attempt + 1), POLLING_INTERVAL);
      } else {
        // Unknown status
        setPollingStatus(`Creating your song... Please wait.`);
        setTimeout(() => pollSongStatus(taskId, attempt + 1), POLLING_INTERVAL);
      }
    } catch (err) {
      console.error('Error checking song status:', err);
      
      // Only handle errors with continued polling - don't retry status checks if they fail badly
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        setPollingStatus('Your song is still being created. Please wait...');
        setTimeout(() => pollSongStatus(taskId, attempt + 1), POLLING_INTERVAL);
      } else if (err.response && err.response.status === 429) {
        setPollingStatus('Still working on your song. This may take a minute...');
        // Wait longer between polls if we're hitting rate limits
        setTimeout(() => pollSongStatus(taskId, attempt + 1), POLLING_INTERVAL * 2);
      } else {
        // For other errors, stop polling and show error message
        setError(`Status check error: ${err.message}. Your song might still be generating in the background. Please check Suno dashboard.`);
        setIsLoading(false);
        setPollingStatus('');
      }
    }
  };

  // Handle song generation after lyrics are created
  useEffect(() => {
    // Only auto-generate if we have lyrics, we're on the right step, and we haven't tried yet
    if (lyrics && step === 8 && !songUrl && !isLoading && !lyricsLoading && !hasAttemptedSongGeneration) {
      generateSong();
    }
  }, [lyrics, step, songUrl, isLoading, lyricsLoading, hasAttemptedSongGeneration]);

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
      // Clear error when going back
      setError('');
    }
  };

  // Reset the form to start over
  const handleReset = () => {
    setStep(0);
    setName('');
    setAge('');
    setGrade('');
    setSubject('');
    setTopic('');
    setLearningType('');
    setMusicGenre('');
    setLyrics('');
    setSongUrl('');
    setError('');
    setSongGenerationId('');
    setHasAttemptedSongGeneration(false);
    setPollingStatus('');
  };

  // Retry song generation if it fails
  const handleRetry = () => {
    if (lyrics) {
      // Reset error state before attempting again
      setError('');
      // Even though we're manually retrying, reset the attempt flag to avoid duplicate retries
      setHasAttemptedSongGeneration(true);
      generateSong();
    } else {
      generateLyrics();
    }
  };

  return (
    <div className="App">
      <div className="app-container">
        <header className="app-header">
          <h1>Educational Song Generator</h1>
          <p>Transform learning into a musical adventure! Create custom educational songs to make studying fun.</p>
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
                    ref={inputRefs.name}
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
                    ref={inputRefs.age}
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
                    ref={inputRefs.grade}
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
                    ref={inputRefs.topic}
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
                    disabled={isLoading || lyricsLoading}
                  >
                    Back
                  </button>
                )}
                {step === 0 ? null : (
                  <button
                    onClick={handleNext}
                    className="primary-button"
                    disabled={isLoading || lyricsLoading}
                  >
                    {step === 7 ? 'Generate' : 'Next'}
                  </button>
                )}
              </div>
              
              <div className="keyboard-tip">
                <small>Pro tip: Press <kbd>Enter</kbd> to continue to the next step</small>
              </div>
            </div>
          )}

          {/* Results Section - Lyrics Generation Loading */}
          {step === 8 && lyricsLoading && (
            <div className="results-panel">
              <h2>Creating Your Educational Lyrics</h2>
              
              <div className="loading-container">
                <p>Creating educational lyrics about {topic} in {musicGenre} style...</p>
                <div className="loading-animation">
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                </div>
                <p className="loading-note">
                  Crafting the perfect educational lyrics to help you learn about {topic}
                </p>
              </div>
            </div>
          )}

          {/* Results Section - Lyrics */}
          {step === 8 && lyrics && !songUrl && !lyricsLoading && (
            <div className="results-panel">
              <h2>Your Educational Lyrics</h2>
              <div className="lyrics-container">
                {lyrics}
              </div>
              
              {isLoading ? (
                <div className="loading-container">
                  <p>{pollingStatus || 'Creating your song...'}</p>
                  <div className="loading-animation">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                  <p className="loading-note">
                    Song generation typically takes 1-2 minutes. Please wait...
                  </p>
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
                    onClick={handleRetry}
                    className="primary-button"
                  >
                    Generate Song
                  </button>
                </div>
              )}
              
              {error && (
                <div className="error-container">
                  <p>{error}</p>
                  {!isLoading && (
                    <button onClick={handleRetry} className="retry-button">
                      Try Again
                    </button>
                  )}
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
                  onClick={handleReset}
                  className="secondary-button"
                >
                  Start Over
                </button>
                <a
                  href={songUrl}
                  download={`${name}_${subject}_${topic}_song.mp3`}
                  target="_blank"
                  rel="noopener noreferrer"
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
                onClick={handleReset}
                className="primary-button"
              >
                Start Over
              </button>
            </div>
          )}
        </main>

        <footer className="app-footer">
          <p>Created by Inaaya Zia</p>
        </footer>
      </div>
    </div>
  );
}

export default App;