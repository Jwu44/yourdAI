from pymongo.mongo_client import MongoClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection
from typing import Dict, Any
from datetime import datetime
from .models.ai_suggestions import AI_SUGGESTION_INDEXES
# Load environment variables
load_dotenv()

# Get MongoDB URI from environment variables
uri = os.getenv("MONGODB_URI") + "&tlsInsecure=true"
if not uri:
    raise ValueError("MONGODB_URI environment variable is not set")

# Create a single client instance to be reused
client = MongoClient(uri)

# Connect to your database
db_name = "YourDaiSchedule"
db = client[db_name]

def get_database():
    """Get MongoDB database instance with connection check."""
    try:
        # Check connection by pinging the database
        client.admin.command('ping')
        print(f"Successfully connected to MongoDB database: {db_name}")
        return db
    except ConnectionFailure as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise

def get_collection(collection_name: str) -> Collection:
    """Get MongoDB collection by name."""
    database = get_database()
    return database[collection_name]

def get_user_schedules_collection() -> Collection:
    """Get collection for storing user schedules."""
    return get_collection('UserSchedules')

def get_microstep_feedback_collection() -> Collection:
    """Get collection for storing microstep feedback."""
    return get_collection('MicrostepFeedback')

def get_decomposition_patterns_collection() -> Collection:
    """Get collection for storing successful decomposition patterns."""
    return get_collection('DecompositionPatterns')

def store_microstep_feedback(feedback_data: Dict[str, Any]) -> bool:
    """
    Store feedback about microstep suggestions.
    
    Args:
        feedback_data: Dictionary containing feedback information
        
    Returns:
        bool: Success status
    """
    try:
        collection = get_microstep_feedback_collection()
        result = collection.insert_one({
            **feedback_data,
            'created_at': datetime.utcnow()
        })
        
        # Update pattern statistics
        if feedback_data.get('accepted'):
            update_decomposition_pattern_stats(
                feedback_data['task_id'],
                feedback_data['microstep_id']
            )
        
        return bool(result.inserted_id)
    except Exception as e:
        print(f"Error storing microstep feedback: {e}")
        return False

def update_decomposition_pattern_stats(task_id: str, microstep_id: str) -> None:
    """
    Update statistics for decomposition patterns.
    
    Args:
        task_id: ID of the parent task
        microstep_id: ID of the accepted microstep
    """
    try:
        # Get task details from user schedules
        schedules_collection = get_user_schedules_collection()
        task = schedules_collection.find_one(
            {"tasks.id": task_id},
            {"tasks.$": 1}
        )
        
        if not task or not task.get('tasks'):
            return
            
        task_data = task['tasks'][0]
        patterns_collection = get_decomposition_patterns_collection()
        
        # Update pattern statistics
        patterns_collection.update_one(
            {
                'task_text': task_data['text'],
                'categories': task_data.get('categories', [])
            },
            {
                '$inc': {
                    'total_suggestions': 1,
                    'accepted_suggestions': 1
                },
                '$set': {
                    'last_used': datetime.utcnow()
                },
                '$push': {
                    'successful_microsteps': microstep_id
                }
            },
            upsert=True
        )
    except Exception as e:
        print(f"Error updating decomposition patterns: {e}")

def get_ai_suggestions_collection() -> Collection:
    """Get collection for storing AI suggestions."""
    return get_collection('AIsuggestions')

def initialize_ai_collections():
    """Initialize collections and indexes for AI suggestions feature."""
    try:
        # Get suggestions collection
        suggestions_collection = get_ai_suggestions_collection()

        # Create indexes for suggestions collection
        for index in AI_SUGGESTION_INDEXES:
            suggestions_collection.create_index(index)

        print("AI suggestions collection initialized successfully")
        
    except Exception as e:
        print(f"Error initializing AI suggestions collection: {e}")
        raise

def initialize_db():
    """
    Initialize database connection and create necessary indices.
    """
    try:
        # Check database connection
        client.admin.command('ismaster')
        print("Successfully connected to MongoDB")
        # Initialize AI suggestions collection
        initialize_ai_collections()
        
        print("Database initialized successfully")
        
    except ConnectionFailure:
        print("Failed to initialize database")
        raise