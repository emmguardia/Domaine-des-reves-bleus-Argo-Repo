{{/*
Labels communs Domaine des Rêves Bleus
*/}}
{{- define "drb.labels" -}}
app.kubernetes.io/part-of: domaine-des-reves-bleus
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "drb.namespace" -}}
{{- .Values.namespace | default "domaine-des-reves-bleus" -}}
{{- end -}}

{{- define "drb.frontend.selectorLabels" -}}
app: domaine-des-reves-bleus-frontend
{{- end -}}

{{- define "drb.backend.selectorLabels" -}}
app: domaine-des-reves-bleus-backend
{{- end -}}
