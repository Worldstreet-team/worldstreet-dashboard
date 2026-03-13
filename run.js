import { PrivyClient } from "@privy-io/node";

const PRIVY_APP_ID = "cmmni9jmg01680dl8itfo3d2u";
const PRIVY_APP_SECRET =
  "privy_app_secret_66H9ys4Tf2KRGSUhq91pZ8MY25STJpNfM2WwfgC8Q2VN9o94AAdCsx1yZEhWTNzongDHHCnVyxVUvUCUiQJkpToJ";

// The Privy user you want to delete
const PRIVY_USER_ID = "did:privy:cmmo8pszc003v0ckv5xjzk9fc";

async function deleteUser() {
  try {
    // Initialize Privy client
    const privy = new PrivyClient({
      appId: PRIVY_APP_ID,
      appSecret: PRIVY_APP_SECRET,
    });

    console.log(`Deleting Privy user with ID: ${PRIVY_USER_ID}...`);

    // Delete the user
    await privy.users().delete(PRIVY_USER_ID);

    console.log(`Privy user ${PRIVY_USER_ID} deleted successfully.`);
  } catch (error) {
    console.error("Error deleting Privy user:", error);
  }
}

deleteUser();