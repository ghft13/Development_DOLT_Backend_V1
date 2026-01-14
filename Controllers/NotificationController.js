const { db, admin } = require("../Config/FireBase.js");

/**
 * Creates a notification in Firestore.
 * @param {string} recipientId - The user ID to receive the notification.
 * @param {string} title - The title of the notification.
 * @param {string} message - The body/message.
 * @param {string} type - 'order' | 'message' | 'system' | 'payment'.
 */
const sendNotification = async (recipientId, title, message, type = "system") => {
    try {
        if (!recipientId) return;

        await db.collection("notifications").add({
            recipientId,
            title,
            message,
            type,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // console.log(`Notification sent to ${recipientId}: ${title}`);
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};

/**
 * Controller to get notifications (optional if using direct Firestore on frontend)
 */
const getNotifications = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ success: false, message: "User ID required" });

        const snapshot = await db.collection("notifications")
            .where("recipientId", "==", userId)
            .orderBy("createdAt", "desc")
            .limit(50)
            .get();

        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ success: false, message: "Failed to fetch notifications" });
    }
};

/**
 * Controller to mark notification as read
 */
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection("notifications").doc(id).update({ read: true });
        res.status(200).json({ success: true, message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { sendNotification, getNotifications, markAsRead };
