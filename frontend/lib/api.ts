const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Create a cache for categorization results
const categoryCache = new Map<string, Promise<{categories: string[]}>>();

export const categorizeTask = async (taskText: string) => {
    const cacheKey = taskText.toLowerCase().trim();
    
    // Return cached promise if it exists
    if (categoryCache.has(cacheKey)) {
        return categoryCache.get(cacheKey);
    }

    // Create new promise for categorization
    const categorizationPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/categorize_task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ task: taskText }),
                // Add credentials to ensure cookies are sent with the request if needed
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok');
            }

            const data = await response.json();
            return { categories: data.categories || ['Uncategorized'] };
        } catch (error) {
            console.error('Error categorizing task:', error);
            return { categories: ['Uncategorized'] };
        }
    })();

    // Cache the promise
    categoryCache.set(cacheKey, categorizationPromise);
    
    return categorizationPromise;
};

// Optional: Add a method to clear the cache if needed
export const clearCategorizationCache = () => {
    categoryCache.clear();
};