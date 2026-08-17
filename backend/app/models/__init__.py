# Exponer modelos principales con alias que coinciden con nombres esperados por pruebas
from .base_model import BaseModel
from .finca import Finca, FarmType
from .user import (
    User,
    Role,
    ApprovalStatus,
    is_role_valid_for_finca,
    get_default_role_for_finca,
)
from .animals import Animals, Animals as Animal
from .species import Species
from .breeds import Breeds, Breeds as Breed
from .fields import Fields, Fields as Field
from .diseases import Diseases, Diseases as Disease
from .animalDiseases import AnimalDiseases, AnimalDiseases as AnimalDisease
from .animalFields import AnimalFields, AnimalFields as AnimalField
from .vaccinations import Vaccinations, Vaccinations as Vaccination
from .vaccines import Vaccines, Vaccines as Vaccine
from .medications import Medications, Medications as Medication
from .treatments import Treatments, Treatments as Treatment
from .treatment_medications import (
    TreatmentMedications,
    TreatmentMedications as TreatmentMedication,
)
from .treatment_vaccines import TreatmentVaccines, TreatmentVaccines as TreatmentVaccine
from .control import Control
from .foodTypes import FoodTypes, FoodTypes as FoodType
from .geneticImprovements import (
    GeneticImprovements,
    GeneticImprovements as GeneticImprovement,
)
from .route_administration import RouteAdministration
from .animal_images import AnimalImages as AnimalImage
from .activity_log import ActivityLog
from .activity_daily_agg import ActivityDailyAgg
from .alerts import AnimalAlertConfig, AnimalAlert
from .farm_entity_alerts import FarmEntityAlertConfig, FarmEntityAlert
from .inventory import InventoryLot, InventoryMovement
from .animal_movements import AnimalMovement, MovementType
from .finca_images import FincaImages
from .membership_request import MembershipRequest, RequestStatus
from .system_content import SystemContent
from .treatment_recommendations import (
    TreatmentRecommendations,
    TreatmentRecommendationStatus,
)
from .treatment_recommendation_controls import TreatmentRecommendationControls
from .user_favorite import UserFavorite
from .reproduction import ReproductiveEvent, Offspring
from .milk_production import MilkProduction
from .lactation_cycle import LactationCycle, LactationStatus
from .production_target import ProductionTarget, TargetPeriod
from .user_finca import UserFinca
from .push_subscription import PushSubscription
from .join_request import (
    JoinRequest,
    JoinRequestStatus,
    JoinRequestType,
    InvitationMethod,
)
from .chat_message import ChatMessage
from .user_location import UserLocation
from .financial import Transaction, TransactionType, TransactionCategory
from .tasks import Tasks, TaskStatus, TaskPriority
from .livestock_summary import LivestockSummary
from .extended_summaries import FinancialSummary, MilkSummary
from .operational_costs import OperationalCost, OperationalCategory
from .operational import (
    AnimalGroup,
    AnimalGroupMembership,
    PastureAforo,
    Infrastructure,
    InfrastructureType,
)
from .production_finance import FarmExpenses
from .sync import (
    Device,
    DeviceStatus,
    SyncOperation,
    SyncOperationStatus,
    SyncSession,
    SyncSessionStatus,
    SyncOperationReceipt,
    SyncConflict,
    AttachmentBlob,
)
from .node_message import NodeMessage, NodeMessageType, NodeMessageStatus
from .territory import Territory, CommunityNode, ConnectivityLevel
from .campesino import (
    CropPlot,
    CropStatus,
    CropActivity,
    CropActivityType,
    WaterSource,
    WaterSourceType,
    WaterMeasurement,
    ClimateRiskAlert,
    RiskSeverity,
    MarketOffer,
    MarketOfferType,
    TechnicalAssistanceRequest,
    AssistanceStatus,
    OfflineLearningMaterial,
    LearningContentType,
)
from .knowledge_base import (
    KBRecomendacion,
    KBRegla,
    KBCalendario,
    KBCategoria,
    KBUrgencia,
    KBSexo,
    KBOperador,
)
from .sinigan_registrations import SiniganRegistrations
from .management_plans import ManagementPlan, PlanType, PlanStatus
from .producer_profiles import ProducerProfile, ProducerType
from .professional_credentials import (
    ProfessionalCredential,
    CredentialTitle,
    CredentialStatus,
)
from .animal_health_history import AnimalHealthHistory, HealthEventType
from .animal_production_metrics import AnimalProductionMetrics, MetricType
from .breeds import BreedPurpose
from .breed_growth_standards import BreedGrowthStandard, GrowthStage
from .body_condition_scores import BodyConditionScore
from .seasonal_adjustments import SeasonalAdjustment
from .weather import (
    WeatherRecord,
    WeatherAlert,
    WeatherCondition,
    WeatherAlertSeverity,
    WeatherAlertType,
)

__all__ = [
    "BaseModel",
    "Finca",
    "FarmType",
    "User",
    "Role",
    "is_role_valid_for_finca",
    "get_default_role_for_finca",
    "Animal",
    "Animals",
    "Species",
    "Breed",
    "Breeds",
    "Field",
    "Fields",
    "Disease",
    "Diseases",
    "AnimalDisease",
    "AnimalDiseases",
    "AnimalField",
    "AnimalFields",
    "Vaccination",
    "Vaccinations",
    "Vaccine",
    "Vaccines",
    "Medication",
    "Medications",
    "Treatment",
    "Treatments",
    "TreatmentMedication",
    "TreatmentMedications",
    "TreatmentVaccine",
    "TreatmentVaccines",
    "Control",
    "FoodType",
    "FoodTypes",
    "GeneticImprovement",
    "GeneticImprovements",
    "RouteAdministration",
    "AnimalImage",
    "ActivityLog",
    "AnimalAlertConfig",
    "AnimalAlert",
    "FarmEntityAlertConfig",
    "FarmEntityAlert",
    "InventoryLot",
    "InventoryMovement",
    "AnimalMovement",
    "MovementType",
    "FincaImages",
    "MembershipRequest",
    "RequestStatus",
    "SystemContent",
    "TreatmentRecommendations",
    "TreatmentRecommendationStatus",
    "TreatmentRecommendationControls",
    "UserFavorite",
    "ReproductiveEvent",
    "Offspring",
    "MilkProduction",
    "LactationCycle",
    "LactationStatus",
    "ProductionTarget",
    "TargetPeriod",
    "UserFinca",
    "PushSubscription",
    "JoinRequest",
    "JoinRequestStatus",
    "JoinRequestType",
    "InvitationMethod",
    "ApprovalStatus",
    "ChatMessage",
    "UserLocation",
    "Transaction",
    "TransactionType",
    "TransactionCategory",
    "Tasks",
    "TaskStatus",
    "TaskPriority",
    "LivestockSummary",
    "FinancialSummary",
    "MilkSummary",
    "OperationalCost",
    "OperationalCategory",
    "AnimalGroup",
    "AnimalGroupMembership",
    "PastureAforo",
    "Infrastructure",
    "InfrastructureType",
    "FarmExpenses",
    "Device",
    "DeviceStatus",
    "SyncOperation",
    "SyncOperationStatus",
    "SyncSession",
    "SyncSessionStatus",
    "SyncOperationReceipt",
    "SyncConflict",
    "AttachmentBlob",
    "NodeMessage",
    "NodeMessageType",
    "NodeMessageStatus",
    "Territory",
    "CommunityNode",
    "ConnectivityLevel",
    "CropPlot",
    "CropStatus",
    "CropActivity",
    "CropActivityType",
    "WaterSource",
    "WaterSourceType",
    "WaterMeasurement",
    "ClimateRiskAlert",
    "RiskSeverity",
    "MarketOffer",
    "MarketOfferType",
    "TechnicalAssistanceRequest",
    "AssistanceStatus",
    "OfflineLearningMaterial",
    "LearningContentType",
    "KBRecomendacion",
    "KBRegla",
    "KBCalendario",
    "SiniganRegistrations",
    "ManagementPlan",
    "PlanType",
    "PlanStatus",
    "ProducerProfile",
    "ProducerType",
    "ProfessionalCredential",
    "CredentialTitle",
    "CredentialStatus",
    "AnimalHealthHistory",
    "HealthEventType",
    "AnimalProductionMetrics",
    "MetricType",
    "BreedPurpose",
    "BreedGrowthStandard",
    "GrowthStage",
    "BodyConditionScore",
    "SeasonalAdjustment",
    "WeatherRecord",
    "WeatherAlert",
    "WeatherCondition",
    "WeatherAlertSeverity",
    "WeatherAlertType",
]
