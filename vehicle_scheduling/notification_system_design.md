# Vehicle Maintenance Scheduler - System Design

## Overview
This is a simple vehicle maintenance scheduler backend that tracks when vehicles are due for service. When the server starts, it checks all vehicles and sends reminders for those whose service is overdue.

## Components
- **app.js**: Main Express server that runs on port 3000
- **logging_middleware**: Logs all incoming requests with method, URL, and timestamp
- **vehicle_maintence_scheduler**: Maintains a list of vehicles and checks if service is due (based on 180-day cycle)
- **notification_app_be**: Sends reminder messages when a vehicle needs service

## Flow
1. Server starts → calls scheduler to check due services → sends notifications for overdue vehicles
2. Each request is logged with method, URL, and timestamp
