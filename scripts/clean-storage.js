/**
 * This script cleans up any potentially corrupted local storage data
 * Run it with: npm run clean
 */

// Function that would run in the browser
const cleanLocalStorage = () => {
  try {
    // Identify pattern for chat room cache keys
    const chatRoomPattern = /^chat_rooms_/;

    // Get all keys in local storage
    const keysToCheck = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && chatRoomPattern.test(key)) {
        keysToCheck.push(key);
      }
    }

    console.log(`Found ${keysToCheck.length} chat room cache keys`);

    // Check and fix each key
    let fixedItems = 0;
    keysToCheck.forEach((key) => {
      try {
        const value = localStorage.getItem(key);
        if (!value) {
          localStorage.removeItem(key);
          fixedItems++;
          return;
        }

        // Try to parse as JSON
        const parsed = JSON.parse(value);

        // Validate it's an array
        if (!Array.isArray(parsed)) {
          localStorage.removeItem(key);
          fixedItems++;
          return;
        }

        // Check if any items are corrupted
        const validItems = parsed.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            item.id.length > 0
        );

        if (validItems.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(validItems));
          fixedItems++;
        }
      } catch (e) {
        // If we can't parse it, remove it
        localStorage.removeItem(key);
        fixedItems++;
      }
    });

    console.log(`Fixed or removed ${fixedItems} corrupted items`);
    console.log("Local storage cleanup complete");

    // Also clear any expired room IDs
    const lastRoomId = localStorage.getItem("lastRoomId");
    if (lastRoomId) {
      console.log("Clearing lastRoomId from localStorage");
      localStorage.removeItem("lastRoomId");
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
};

// Instructions for manual execution
console.log(`
To clean up potentially corrupted storage data:

1. Open your web app in the browser
2. Open DevTools (F12 or Right-click > Inspect)
3. Go to the Console tab
4. Paste and run the following code:

(${cleanLocalStorage.toString()})();

5. Refresh the page
`);
