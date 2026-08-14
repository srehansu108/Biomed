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
            # ✅ FIX: Safely drop and recreate indexes to avoid conflicts
            
            # Patients Collection Indexes
            patients = self.db.patients
            
            # Drop existing indexes if they exist (to avoid conflicts)
            try:
                await patients.drop_index("patient_id_1")
            except:
                pass  # Index doesn't exist
            try:
                await patients.drop_index("email_1")
            except:
                pass
            try:
                await patients.drop_index("phone_1")
            except:
                pass
            
            # Create fresh indexes
            await patients.create_index("patient_id", unique=True)
            await patients.create_index("email", unique=True)
            await patients.create_index("phone", unique=True)
            await patients.create_index("has_biometric")
            await patients.create_index("registration_complete")
            await patients.create_index("full_name")
            # Compound index for common queries
            await patients.create_index(
                [("has_biometric", 1), ("registration_complete", 1)]
            )
            
            # ✅ Medicines Collection Indexes
            medicines = self.db.medicines
            try:
                await medicines.drop_index("medicine_id_1")
            except:
                pass
            try:
                await medicines.drop_index("name_1")
            except:
                pass
            try:
                await medicines.drop_index("batch_number_1")
            except:
                pass
            
            await medicines.create_index("medicine_id", unique=True)
            await medicines.create_index("name")
            await medicines.create_index("batch_number")
            await medicines.create_index("category")
            await medicines.create_index("quantity")
            await medicines.create_index("expiry_date")
            # Compound index for stock queries
            await medicines.create_index(
                [("quantity", 1), ("expiry_date", 1)]
            )
            
            # ✅ Prescriptions Collection Indexes
            prescriptions = self.db.prescriptions
            try:
                await prescriptions.drop_index("prescription_id_1")
            except:
                pass
            
            await prescriptions.create_index("prescription_id", unique=True)
            await prescriptions.create_index("patient_id")
            await prescriptions.create_index("status")
            await prescriptions.create_index("created_at")
            # Compound index for patient prescriptions
            await prescriptions.create_index(
                [("patient_id", 1), ("status", 1), ("created_at", -1)]
            )
            
            # ✅ WebAuthn Credentials Collection
            webauthn_creds = self.db.webauthn_credentials
            try:
                await webauthn_creds.drop_index("credential_id_1")
            except:
                pass
            try:
                await webauthn_creds.drop_index("patient_id_1")
            except:
                pass
            
            await webauthn_creds.create_index("credential_id", unique=True)
            await webauthn_creds.create_index("patient_id", unique=True)
            await webauthn_creds.create_index("last_used")
            
            # ✅ WebAuthn Challenges Collection - NEW
            webauthn_challenges = self.db.webauthn_challenges
            try:
                await webauthn_challenges.drop_index("patient_id_1")
            except:
                pass
            try:
                await webauthn_challenges.drop_index("email_1")
            except:
                pass
            try:
                await webauthn_challenges.drop_index("ttl_expires_at")
            except:
                pass
            
            await webauthn_challenges.create_index("patient_id")
            await webauthn_challenges.create_index("email")
            # TTL index to auto-delete expired challenges
            await webauthn_challenges.create_index(
                "expires_at", 
                expireAfterSeconds=0,
                name="ttl_expires_at"
            )
            
            # ✅ Sales Collection Indexes
            sales = self.db.sales
            try:
                await sales.drop_index("sale_id_1")
            except:
                pass
            
            await sales.create_index("sale_id", unique=True)
            await sales.create_index("patient_id")
            await sales.create_index("created_at")
            await sales.create_index("total_amount")
            # Compound index for date range queries
            await sales.create_index([("created_at", -1), ("total_amount", 1)])
            
            # ✅ Audit Logs Collection - Auto-expire after 30 days
            audit_logs = self.db.audit_logs
            try:
                await audit_logs.drop_index("timestamp_1")
            except:
                pass
            try:
                await audit_logs.drop_index("user_id_1")
            except:
                pass
            try:
                await audit_logs.drop_index("action_1")
            except:
                pass
            
            await audit_logs.create_index("timestamp", expireAfterSeconds=2592000)
            await audit_logs.create_index("user_id")
            await audit_logs.create_index("action")
            await audit_logs.create_index("timestamp")
            
            # ✅ Inventory Transactions Collection
            inventory = self.db.inventory_transactions
            try:
                await inventory.drop_index("medicine_id_1")
            except:
                pass
            try:
                await inventory.drop_index("transaction_date_1")
            except:
                pass
            try:
                await inventory.drop_index("transaction_type_1")
            except:
                pass
            
            await inventory.create_index("medicine_id")
            await inventory.create_index("transaction_date")
            await inventory.create_index("transaction_type")
            # Compound index for stock history
            await inventory.create_index(
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