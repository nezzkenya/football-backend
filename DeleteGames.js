import db from "./connection.js";
// Function to check if a date is more than two hours ago
function isMoreThanTwoHoursAgo(dateTimeString) {
  const dateTime = new Date(dateTimeString);
  const currentTime = new Date();
  const twoHoursAgo = new Date(currentTime.getTime() - 2 *60 * 60 * 1000);
  return dateTime < twoHoursAgo;
}

// Connect to MongoDB and perform operations
export default async function main() {

    try {

        const collection = db.collection("games");

        // Find all documents
        const documents = await collection.find({}).toArray();

        // Filter documents based on the function
        const documentsToDelete = documents.filter((doc) =>
            isMoreThanTwoHoursAgo(doc.date)
        );

        // Delete filtered documents
        if (documentsToDelete.length > 0) {
            const deletePromises = documentsToDelete.map((doc) =>
                collection.deleteOne({ _id: doc._id })
            );
            await Promise.all(deletePromises);
            console.log(`${documentsToDelete.length} document(s) deleted`);
        } else {
            console.log("No documents to delete");
        }
    } catch (err) {
        console.error("Error occurred:", err);
    }

}