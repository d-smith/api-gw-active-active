#!/bin/bash

aws route53 list-health-checks --query 'HealthChecks[*].{FQDN:HealthCheckConfig.FullyQualifiedDomainName,healthCheckId:Id}'
