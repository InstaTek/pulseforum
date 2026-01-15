PulseForum – Peculiar Sightings Reporting System

Overview:

  PulseForum is a web-based reporting system that allows users to submit and view reports of unusual or “peculiar” sightings, such as ghosts, escaped magical animals, or other unexplained events. The application has been developed to meet the requirements of the Report a Peculiar Sighting assessment brief as part of a Level 4 Software Developer apprenticeship.
  The system demonstrates server-side development, form handling, data validation, database interaction, and deployment to a public hosting platform.

Features:

  Report a Sighting
  
  Users can submit a sighting report that includes:
  
    Reporter name (required)
    
    Optional contact details
    
    Type of sighting (ghost, animal, or other)
    
    Conditional subject selection based on the chosen type
    
    Date and time of the event
    
    Location
    
    Description of what was sighted
    
All submissions are validated on the server to ensure data quality.

View Reports:

  Submitted reports are stored in a relational database and displayed to users on a dedicated reports page. Reports are ordered by most recent submission and presented in a clear, readable format.  

Additional Functionality:

  In addition to the core reporting feature, the application includes a discussion forum with:
  
    Categories, topics, and posts
    
    User registration and login
    
    Session-based authentication
    
  This functionality demonstrates an understanding of relational data structures and user authentication, but is not required to meet the core assessment brief.
  
Technology Stack:

  Frontend
  
    HTML5
    
    CSS3
    
    EJS templates
    
  Backend
  
    Node.js
    
    Express
    
  Database
  
    SQLite (via better-sqlite3)
    
  Authentication
  
    express-session
    
    bcrypt
    
  Deployment
  
    GitHub and Render

Accessibility Considerations:

  Accessibility has been considered through the use of semantic HTML, labelled form inputs, keyboard-friendly navigation, and clear validation feedback.

Deployment:

  The application is deployed using Render and is accessible via a public URL. Environment variables are used to manage sensitive configuration, such as session secrets, ensuring they are not hard-coded in the repository.
  
  https://pulseforum.onrender.com

Reflection:

  One of the main challenges during development was deploying a server-side Node.js application to a cloud hosting platform. This required an understanding of how production environments differ from local development, particularly in relation to environment variables, port configuration, and session security.
  
  Another challenge was ensuring the database schema supported the required relationships while remaining simple and reliable. Using SQLite helped reinforce my understanding of relational data and SQL queries.
  
  Overall, this project improved my confidence with full-stack development, debugging real deployment issues, and structuring an application that separates concerns between routing, data access, and presentation. These are skills I will continue to develop throughout my apprenticeship.
  

Author:

  Developed by Rybo as part of a Level 4 Software Developer apprenticeship assessment.
