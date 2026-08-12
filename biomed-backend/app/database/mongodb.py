from motor.motor_asyncio import AsyncIOMotorClient
from ..config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

    async def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URL)
            self.db = self.client[settings.DATABASE_NAME]
            
            # Test connection
            await self.db.command("ping")
            
            # Create indexes
            await self.create_indexes()
            print("✅ Connected to MongoDB")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            return False

    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            print("✅ Disconnected from MongoDB")

    async def create_indexes(self):
        """Create database indexes for performance"""
        try:
            # Patients
            await self.db.patients.create_index("email", unique=True)
            await self.db.patients.create_index("phone", unique=True)
            await self.db.patients.create_index("patient_id", unique=True)
            
            # Medicines
            await self.db.medicines.create_index("medicine_id", unique=True)
            await self.db.medicines.create_index("name")
            await self.db.medicines.create_index("batch_number")
            
            # Prescriptions
            await self.db.prescriptions.create_index("prescription_id", unique=True)
            await self.db.prescriptions.create_index("patient_id")
            
            # WebAuthn credentials
            await self.db.webauthn_credentials.create_index("credential_id", unique=True)
            await self.db.webauthn_credentials.create_index("patient_id")
            
            # Audit logs - auto-expire after 30 days
            await self.db.audit_logs.create_index("timestamp", expireAfterSeconds=2592000)
            print("✅ Database indexes created")
        except Exception as e:
            print(f"⚠️ Index creation warning: {e}")

database = Database()