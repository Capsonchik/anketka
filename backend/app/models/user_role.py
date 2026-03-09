from enum import Enum


class UserRole(str, Enum):
  admin = 'admin'
  coordinator = 'coordinator'
  manager = 'manager'
  client = 'client'
  controller = 'controller'

