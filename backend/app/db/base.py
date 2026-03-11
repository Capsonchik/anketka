from app.db.base_class import Base


# Важно: импортируем модели, чтобы они зарегистрировались в metadata
from app.models.checklist import Checklist  # noqa: E402,F401
from app.models.checklist_item import ChecklistItem  # noqa: E402,F401
from app.models.company import Company  # noqa: E402,F401
from app.models.company_settings import CompanySettings  # noqa: E402,F401
from app.models.project import Project  # noqa: E402,F401
from app.models.refresh_token import RefreshToken  # noqa: E402,F401
from app.models.ref_brand import RefBrand  # noqa: E402,F401
from app.models.ref_category import RefCategory  # noqa: E402,F401
from app.models.ref_city import RefCity  # noqa: E402,F401
from app.models.ref_product import RefProduct  # noqa: E402,F401
from app.models.ref_region import RefRegion  # noqa: E402,F401
from app.models.shop_chain import ShopChain  # noqa: E402,F401
from app.models.shop_point import ShopPoint  # noqa: E402,F401
from app.models.survey import Survey  # noqa: E402,F401
from app.models.project_survey import ProjectSurvey  # noqa: E402,F401
from app.models.auditor import Auditor  # noqa: E402,F401
from app.models.auditor_refresh_token import AuditorRefreshToken  # noqa: E402,F401
from app.models.project_survey_auditor import ProjectSurveyAuditor  # noqa: E402,F401
from app.models.survey_page import SurveyPage  # noqa: E402,F401
from app.models.survey_question import SurveyQuestion  # noqa: E402,F401
from app.models.survey_question_option import SurveyQuestionOption  # noqa: E402,F401
from app.models.survey_invite import SurveyInvite  # noqa: E402,F401
from app.models.survey_attempt import SurveyAttempt  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401
from app.models.owner_company_access import OwnerCompanyAccess  # noqa: E402,F401
from app.models.user_project_access import UserProjectAccess  # noqa: E402,F401
from app.models.user_point_access import UserPointAccess  # noqa: E402,F401
from app.models.user_group import UserGroup  # noqa: E402,F401
from app.models.user_group_member import UserGroupMember  # noqa: E402,F401
from app.models.user_company_access import UserCompanyAccess  # noqa: E402,F401
from app.models.user_company_distribution import UserCompanyDistribution  # noqa: E402,F401
from app.models.user_company_reports import UserCompanyReports  # noqa: E402,F401

