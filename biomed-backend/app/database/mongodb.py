from motor.motor_asyncio import AsyncIOMotorClient
from ..config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

    async def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                maxPoolSize=50,
                minPoolSize=10,
                maxIdleTimeMS=60000,
                connectTimeoutMS=10000,
                serverSelectionTimeoutMS=10000
            )
            self.db = self.client[settings.DATABASE_NAME]
            
            # Test connection
            await self.db.command("ping")
            
            # Create indexes
            await self.create_indexes()
            logger.info("✅ Connected to MongoDB")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            return False

    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            logger.info("✅ Disconnected from MongoDB")

    async def create_indexes(self):
        """Create database indexes for performance"""
        try:
            # ✅ Patients Collection Indexes
            await self.db.patients.create_index("email", unique=True)
            await self.db.patients.create_index("phone", unique=True)
            await self.db.patients.create_index("patient_id", unique=True)
            await self.db.patients.create_index("has_biometric")
            await self.db.patients.create_index("registration_complete")  # ✅ ADDED
            await self.db.patients.create_index("full_name")
            # Compound index for common queries
            await self.db.patients.create_index(
                [("has_biometric", 1), ("registration_complete", 1)]
            )
            
            # ✅ Medicines Collection Indexes
            await self.db.medicines.create_index("medicine_id", unique=True)
            await self.db.medicines.create_index("name")
            await self.db.medicines.create_index("batch_number")
            await self.db.medicines.create_index("category")
            await self.db.medicines.create_index("quantity")
            await self.db.medicines.create_index("expiry_date")
            # Compound index for stock queries
            await self.db.medicines.create_index(
                [("quantity", 1), ("expiry_date", 1)]
            )
            
            # ✅ Prescriptions Collection Indexes
            await self.db.prescriptions.create_index("prescription_id", unique=True)
            await self.db.prescriptions.create_index("patient_id")
            await self.db.prescriptions.create_index("status")
            await self.db.prescriptions.create_index("created_at")
            # Compound index for patient prescriptions
            await self.db.prescriptions.create_index(
                [("patient_id", 1), ("status", 1), ("created_at", -1)]
            )
            
            # ✅ WebAuthn Credentials Collection
            await self.db.webauthn_credentials.create_index("credential_id", unique=True)
            await self.db.webauthn_credentials.create_index("patient_id", unique=True)
            await self.db.webauthn_credentials.create_index("last_used")
            
            # ✅ WebAuthn Challenges Collection - NEW
            await self.db.webauthn_challenges.create_index("expires_at", expireAfterSeconds=0)
            await self.db.webauthn_challenges.create_index("patient_id")
            await self.db.webauthn_challenges.create_index("email")
            # TTL index to auto-delete expired challenges (runs every 60 seconds)
            await self.db.webauthn_challenges.create_index(
                "expires_at", 
                expireAfterSeconds=0,  # MongoDB will delete documents when expires_at < current time
                name="ttl_expires_at"
            )
            
            # ✅ Sales Collection Indexes
            await self.db.sales.create_index("sale_id", unique=True)
            await self.db.sales.create_index("patient_id")
            await self.db.sales.create_index("created_at")
            await self.db.sales.create_index("total_amount")
            # Compound index for date range queries
            await self.db.sales.create_index([("created_at", -1), ("total_amount", 1)])
            
            # ✅ Audit Logs Collection - Auto-expire after 30 days
            await self.db.audit_logs.create_index("timestamp", expireAfterSeconds=2592000)
            await self.db.audit_logs.create_index("user_id")
            await self.db.audit_logs.create_index("action")
            await self.db.audit_logs.create_index("timestamp")
            
            # ✅ Inventory Transactions Collection
            await self.db.inventory_transactions.create_index("medicine_id")
            await self.db.inventory_transactions.create_index("transaction_date")
            await self.db.inventory_transactions.create_index("transaction_type")
            # Compound index for stock history
            await self.db.inventory_transactions.create_index(
                [("medicine_id", 1), ("transaction_date", -1)]
            )
            
            logger.info("✅ All database indexes created successfully")
        except Exception as e:
            logger.error(f"⚠️ Index creation warning: {e}")
            # Don't raise - indexes are optimization, not critical for functionality

    async def get_collection(self, name: str):
        """Get a collection by name"""
        if self.db is None:
            raise RuntimeError("Database not connected")
        return self.db[name]

    async def ping(self):
        """Check database connection"""
        if self.db is None:
            return False
        try:
            await self.db.command("ping")
            return True
        except Exception:
            return False

database = Database()