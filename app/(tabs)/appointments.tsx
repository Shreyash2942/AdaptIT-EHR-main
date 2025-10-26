import { Feather } from '@expo/vector-icons'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      input: any
    }
  }
}

declare const require: any

const WEB_DATE_INPUT_CLASS = 'appointments-date-input-overlay'
const WEB_DATE_INPUT_STYLE_ID = 'appointments-date-input-styles'
let webDateInputStylesInjected = false
const ensureWebDateInputStyles = () => {
  if (webDateInputStylesInjected || typeof document === 'undefined') {
    return
  }

  const style = document.createElement('style')
  style.id = WEB_DATE_INPUT_STYLE_ID
  style.textContent = `
    .${WEB_DATE_INPUT_CLASS} {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      background: transparent;
      border: none;
      z-index: 5;
      color: transparent;
      pointer-events: none;
    }

    .${WEB_DATE_INPUT_CLASS}:focus {
      outline: none;
    }

    .${WEB_DATE_INPUT_CLASS}::-webkit-calendar-picker-indicator {
      opacity: 0;
    }

    .${WEB_DATE_INPUT_CLASS}[disabled] {
      cursor: not-allowed;
    }

  `
  document.head.appendChild(style)
  webDateInputStylesInjected = true
}

const isWebPlatform = Platform.OS === 'web'
let NativeDateTimePickerModule: any = null

if (!isWebPlatform) {
  try {
    NativeDateTimePickerModule = require('@react-native-community/datetimepicker')
  } catch (error) {
    console.warn(
      'Optional dependency @react-native-community/datetimepicker is not installed; falling back to manual date entry on native.',
      error,
    )
  }
}

const NativeDateTimePicker = NativeDateTimePickerModule?.default ?? NativeDateTimePickerModule
const NativeDateTimePickerAndroid = NativeDateTimePickerModule?.DateTimePickerAndroid

import { Card } from '@/components/ui/Card'
import { PageActionButton } from '@/components/ui/PageActionButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Colors } from '@/constants/Colors'
import { Styles } from '@/constants/Styles'

// ------------------------------
// Data models and configuration.
// ------------------------------

type AppointmentStatus =
  | 'Upcoming'
  | 'Pending'
  | 'Cancelled'
  | 'Completed(check-out)'
  | 'CheckIn'
  | 'Booked'

type AppointmentRow = {
  id: string
  patient: {
    name: string
    initials: string
  }
  schedule: {
    date: string
    startTime: string
    endTime: string
  }
  provider: string
  clinic?: string
  service: string
  description: string
  charges: {
    amount: number
    currency: string
  }
  paymentMode: string
  status: AppointmentStatus
  patientContact?: string
  auditTrail?: string[]
}

// Segments drive the appointment filter tabs (all | upcoming | past).
const SEGMENTS = ['all', 'Upcoming', 'past'] as const

const SEGMENT_LABELS: Record<(typeof SEGMENTS)[number], string> = {
  all: 'all',
  Upcoming: 'Upcoming',
  past: 'past',
}

// Export buttons and labels used when bulk exporting appointment data.
const EXPORT_OPTIONS = [
  { id: 'csv', label: 'Export CSV', icon: 'file-text' as const },
  { id: 'excel', label: 'Export Excel', icon: 'grid' as const },
  { id: 'pdf', label: 'Export PDF', icon: 'file' as const },
] as const

type ExportOptionId = (typeof EXPORT_OPTIONS)[number]['id']

const STATUS_STYLES: Record<AppointmentStatus, { background: string; color: string }> = {
  Upcoming: { background: '#2F6FE1', color: '#FFFFFF' },
  Pending: { background: '#FFF3E0', color: '#FFA743' },
  Cancelled: { background: '#FFE9E9', color: '#C72424' },
  'Completed(check-out)': { background: '#E9F7EE', color: '#1E7A3D' },
  CheckIn: { background: '#E3EFFD', color: '#1F3D6E' },
  Booked: { background: '#2F6FE1', color: '#FFFFFF' },
}

type FilterStatusValue = 'all' | AppointmentStatus

type PickerTarget =
  | 'filter-status'
  | 'form-status'
  | 'filter-patient'
  | 'filter-doctor'
  | 'form-patient'
  | 'form-doctor'
type PickerPosition = { x: number; y: number; width: number; height: number }

const PATIENT_OPTIONS = [
  { value: 'AdaptIT_Sample_Patient1', label: 'AdaptIT_Sample_Patient1' },
  { value: 'AdaptIT_Sample_Patient2', label: 'AdaptIT_Sample_Patient2' },
] as const

type PatientOptionValue = (typeof PATIENT_OPTIONS)[number]['value']
type FilterPatientValue = 'all' | PatientOptionValue

const DOCTOR_OPTIONS = [
  { value: 'AdaptIT_Sample_Doctor1 (Family Medicine)', label: 'AdaptIT_Sample_Doctor1 (Family Medicine)' },
  { value: 'AdaptIT_Sample_Doctor2 (Neurology)', label: 'AdaptIT_Sample_Doctor2 (Neurology)' },
] as const

type DoctorOptionValue = (typeof DOCTOR_OPTIONS)[number]['value']
type FilterDoctorValue = 'all' | DoctorOptionValue

const FILTER_STATUS_BASE_OPTIONS: Array<{ value: AppointmentStatus; label: string }> = [
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Completed(check-out)', label: 'Completed(check-out)' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'CheckIn', label: 'CheckIn' },
  { value: 'Pending', label: 'Pending' },
]

const FILTER_STATUS_OPTIONS: Array<{ value: FilterStatusValue; label: string }> = [
  { value: 'all', label: 'All' },
  ...FILTER_STATUS_BASE_OPTIONS,
]

const FILTER_PATIENT_OPTIONS: Array<{ value: FilterPatientValue; label: string }> = [
  ...PATIENT_OPTIONS,
]

const FILTER_DOCTOR_OPTIONS: Array<{ value: FilterDoctorValue; label: string }> = [
  ...DOCTOR_OPTIONS,
]

const FORM_STATUS_OPTIONS: Array<{ value: AppointmentStatus; label: string }> = [
  { value: 'Booked', label: 'Booked' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Completed(check-out)', label: 'Check out' },
  { value: 'CheckIn', label: 'Check in' },
  { value: 'Cancelled', label: 'Cancelled' },
]

const getStatusOptionLabel = (value: FilterStatusValue) => {
  if (value === 'all') {
    return 'All'
  }

  const match =
    FILTER_STATUS_BASE_OPTIONS.find((option) => option.value === value) ??
    FORM_STATUS_OPTIONS.find((option) => option.value === value)

  return match?.label ?? value
}

const getPatientOptionLabel = (value: FilterPatientValue) => {
  if (value === 'all') {
    return 'All'
  }
  return PATIENT_OPTIONS.find((option) => option.value === value)?.label ?? value
}

const getDoctorOptionLabel = (value: FilterDoctorValue) => {
  if (value === 'all') {
    return 'All'
  }
  return DOCTOR_OPTIONS.find((option) => option.value === value)?.label ?? value
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  CAD: '$',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
}

// Backend integration: replace this stub with data from your appointments API.
const APPOINTMENTS: AppointmentRow[] = [
  {
    id: '1',
    patient: {
      name: 'AdaptIT_Sample_Patient1',
      initials: 'A',
    },
    schedule: {
      date: '2025-09-18',
      startTime: '10:00',
      endTime: '10:30',
    },
    provider: 'AdaptIT_Sample_Doctor1 (Family Medicine)',
    clinic: 'AdaptIT Sample Clinic',
    service: 'Mild Illness Assessment',
    description: 'No Records Found',
    charges: {
      amount: 50,
      currency: 'CAD',
    },
    paymentMode: 'Manual',
    status: 'Booked',
    patientContact: '608-213-5806',
    auditTrail: ['APP MOD from Webmaster :', 'APP MOD from admin1 :', 'APP MOD from admin2 :'],
  },
  {
    id: '2',
    patient: {
      name: 'AdaptIT_Sample_Patient2',
      initials: 'A',
    },
    schedule: {
      date: '2023-03-08',
      startTime: '09:00',
      endTime: '09:30',
    },
    provider: 'AdaptIT_Sample_Doctor2 (Neurology)',
    clinic: 'AdaptIT Specialist Clinic',
    service: 'Neurology Consultation',
    description: 'Discuss recovery progress',
    charges: {
      amount: 120,
      currency: 'USD',
    },
    paymentMode: 'Insurance',
    status: 'Completed(check-out)',
    patientContact: '403-555-8890',
    auditTrail: ['APP MOD from admin1 :'],
  },
]

// Helper: render ISO date strings as DD-MM-YYYY for consistency with UI comps.
const formatDisplayDate = (date: string) => {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  const day = String(parsed.getDate()).padStart(2, '0')
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const year = String(parsed.getFullYear())

  return `${day}-${month}-${year}`
}

// Helper: format charge structures as e.g. $50CAD (currency suffix matches design).
const formatChargeLabel = (charges: AppointmentRow['charges']) => {
  const symbol = CURRENCY_SYMBOLS[charges.currency] ?? ''
  return `${symbol}${charges.amount}${charges.currency}`
}

// Helper: combine start/end time for appointment subtitle.
const buildTimeWindow = (schedule: AppointmentRow['schedule']) =>
  `${schedule.startTime} - ${schedule.endTime}`

// Helper: convert appointment schedule into Date for range comparisons.
const getScheduleDateTime = (schedule: AppointmentRow['schedule']) =>
  new Date(`${schedule.date}T${schedule.startTime}`)

// Helper: group audit trail entries into two-column rows for the detail modal.
const chunkAuditTrail = (entries: string[]): Array<[string, string]> => {
  const rows: Array<[string, string]> = []
  for (let index = 0; index < entries.length; index += 2) {
    rows.push([entries[index] ?? '—', entries[index + 1] ?? ''])
  }
  return rows
}
// Primary screen component that hosts filters, creation form, list, and import modal.
export default function AppointmentsScreen() {
  // UI state: selected filter tab, panel expansion flags, import modal.
  const [selectedSegment, setSelectedSegment] = useState(1)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [formExpanded, setFormExpanded] = useState(false)
  const [importVisible, setImportVisible] = useState(false)
  // Layout measurement caches used to drive expand/collapse animations.
  const [measuredFilterHeight, setMeasuredFilterHeight] = useState(0)
  const [measuredFormHeight, setMeasuredFormHeight] = useState(0)
  // Hover state for export buttons (web only) and bulk delete mode toggle.
  const getTodayISO = () => new Date().toISOString().split('T')[0]
  const [hoveredExport, setHoveredExport] = useState<ExportOptionId | null>(null)
  const [bulkDeleteEnabled, setBulkDeleteEnabled] = useState(false)
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<string[]>([])
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatusValue>('all')
  const [filterPatient, setFilterPatient] = useState<FilterPatientValue>('all')
  const [filterDoctor, setFilterDoctor] = useState<FilterDoctorValue>('all')
  const [formAppointmentDate, setFormAppointmentDate] = useState<string>(getTodayISO())
  const [formStatus, setFormStatus] = useState<AppointmentStatus>('Booked')
  const [formPatient, setFormPatient] = useState<PatientOptionValue | null>(null)
  const [formDoctor, setFormDoctor] = useState<DoctorOptionValue | null>(null)
  // Tracks which appointment is opened in the detail modal.
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null)
  const [activeNativePicker, setActiveNativePicker] = useState<'filter' | 'form' | null>(null)
  const [pendingNativeDate, setPendingNativeDate] = useState(new Date())
  const filterStatusButtonRef = useRef<View | null>(null)
  const filterPatientButtonRef = useRef<View | null>(null)
  const filterDoctorButtonRef = useRef<View | null>(null)
  const formStatusButtonRef = useRef<View | null>(null)
  const formPatientButtonRef = useRef<View | null>(null)
  const formDoctorButtonRef = useRef<View | null>(null)
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null)
  const [pickerPosition, setPickerPosition] = useState<PickerPosition | null>(null)

  const closePicker = () => {
    setPickerTarget(null)
    setPickerPosition(null)
  }

  const openPicker = (target: PickerTarget) => {
    const anchor =
      target === 'form-status'
        ? formStatusButtonRef.current
        : target === 'filter-status'
        ? filterStatusButtonRef.current
        : target === 'filter-patient'
        ? filterPatientButtonRef.current
        : target === 'filter-doctor'
        ? filterDoctorButtonRef.current
        : target === 'form-patient'
        ? formPatientButtonRef.current
        : formDoctorButtonRef.current

    setPickerTarget(target)
    setPickerPosition(null)

    if (anchor?.measureInWindow) {
      anchor.measureInWindow((x, y, widthMeasure, heightMeasure) => {
        setPickerPosition({ x, y, width: widthMeasure, height: heightMeasure })
      })
    }
  }

  const handlePickerSelect = (value: string) => {
    switch (pickerTarget) {
      case 'filter-status':
        setFilterStatus(value as FilterStatusValue)
        break
      case 'form-status':
        setFormStatus(value as AppointmentStatus)
        break
      case 'filter-patient':
        setFilterPatient(value as FilterPatientValue)
        break
      case 'filter-doctor':
        setFilterDoctor(value as FilterDoctorValue)
        break
      case 'form-patient':
        setFormPatient(value as PatientOptionValue)
        break
      case 'form-doctor':
        setFormDoctor(value as DoctorOptionValue)
        break
      default:
        break
    }
    closePicker()
  }

  const handleClearFilterStatus = (event: GestureResponderEvent) => {
    event.stopPropagation()
    setFilterStatus('all')
    if (pickerTarget === 'filter-status') {
      closePicker()
    }
  }

  const handleClearFilterPatient = (event: GestureResponderEvent) => {
    event.stopPropagation()
    setFilterPatient('all')
    if (pickerTarget === 'filter-patient') {
      closePicker()
    }
  }

  const handleClearFilterDoctor = (event: GestureResponderEvent) => {
    event.stopPropagation()
    setFilterDoctor('all')
    if (pickerTarget === 'filter-doctor') {
      closePicker()
    }
  }

  // Responsive detection: drive layout tweaks for tablets and phones.
  const { width } = useWindowDimensions()

  const isSmallScreen = width < 768
  const isMediumScreen = width >= 768 && width < 1200

  // Animated values managing filter/form accordion behaviour.
  const filterAnimation = useRef(new Animated.Value(0)).current
  const formAnimation = useRef(new Animated.Value(0)).current

  // Active segment key resolves from index to string (fallback defaults to 'all').
  const segmentKey = SEGMENTS[selectedSegment] ?? 'all'

  // Backend integration: replace this memo with server-driven filtering when hooking up the API.
  // Currently filters mock data locally; swap to API query when backend is wired up.
  const filteredAppointments = useMemo(() => {
    const now = new Date()
    const selectedDate = filterDate && filterDate.length === 10 ? filterDate : null

    return APPOINTMENTS.filter((appointment) => {
      if (selectedDate && appointment.schedule.date !== selectedDate) {
        return false
      }

      if (filterStatus !== 'all' && appointment.status !== filterStatus) {
        return false
      }

      if (filterPatient !== 'all' && appointment.patient.name !== filterPatient) {
        return false
      }

      if (filterDoctor !== 'all' && appointment.provider !== filterDoctor) {
        return false
      }

      if (segmentKey === 'all') {
        return true
      }

      const appointmentDate = getScheduleDateTime(appointment.schedule)
      if (segmentKey === 'Upcoming') {
        return appointmentDate >= now
      }

      return appointmentDate < now
    })
  }, [segmentKey, filterDate, filterStatus, filterPatient, filterDoctor])

  // Helper flags determine visibility of bulk/exports (only when multiple records exist).
  const hasMultipleRecords = filteredAppointments.length > 1
  const showBulkDeleteAction = hasMultipleRecords
  const showExportButtons = hasMultipleRecords
  const bulkDeleteActive = bulkDeleteEnabled && showBulkDeleteAction
  const anySelected = selectedAppointmentIds.length > 0
  const allSelected =
    bulkDeleteActive &&
    filteredAppointments.length > 0 &&
    selectedAppointmentIds.length === filteredAppointments.length

  // UI actions that open/close panels and dialogs.
  const toggleFilters = () =>
    setFiltersExpanded((prev) => {
      const next = !prev
      if (prev && pickerTarget && pickerTarget.startsWith('filter-')) {
        closePicker()
      }
      return next
    })
  const toggleForm = () =>
    setFormExpanded((prev) => {
      const next = !prev
      if (next) {
        setFormAppointmentDate(getTodayISO())
        setFormStatus('Booked')
        setFormPatient(null)
        setFormDoctor(null)
      } else if (pickerTarget && pickerTarget.startsWith('form-')) {
        closePicker()
      }
      return next
    })
  const openImport = () => setImportVisible(true)
  const closeImport = () => setImportVisible(false)

  // Backend integration: wire up navigation or detail modal here.
  const handleViewAppointment = (appointment: AppointmentRow) => {
    setSelectedAppointment(appointment)
  }

  // Backend integration: trigger server-side PDF/export once available.
  const handlePrintAppointment = (appointment: AppointmentRow) => {
    void appointment
  }

  // Backend integration: call delete endpoint and refresh local list.
  const handleDeleteAppointment = (appointment: AppointmentRow) => {
    void appointment
  }

  // Backend integration: invoke export endpoint for the selected format.
  const handleExport = (type: ExportOptionId) => {
    void type
  }

  // Enables multi-select delete mode; future backend will likely read this flag.
  const toggleBulkDeleteMode = () => {
    setBulkDeleteEnabled((prev) => {
      if (prev) {
        setSelectedAppointmentIds([])
      }
      return !prev
    })
  }

  // Clears the currently selected appointment and hides detail modal.
  const closeAppointmentDetails = () => setSelectedAppointment(null)

  const toggleSelectAppointment = (appointmentId: string) => {
    setSelectedAppointmentIds((current) => {
      const isSelected = current.includes(appointmentId)
      if (isSelected) {
        return current.filter((id) => id !== appointmentId)
      }
      return [...current, appointmentId]
    })
  }

  const toggleSelectAll = () => {
    setSelectedAppointmentIds((current) => {
      const currentIds = new Set(current)
      const allIds = filteredAppointments.map((appointment) => appointment.id)
      const isAllSelected = allIds.every((id) => currentIds.has(id))
      return isAllSelected ? [] : allIds
    })
  }

  const handleDeleteSelectedAppointments = () => {
    void selectedAppointmentIds
  }

  const sanitizeDateInput = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 8)
    if (digits.length === 0) {
      return ''
    }
    if (digits.length <= 4) {
      return digits
    }
    if (digits.length <= 6) {
      return `${digits.slice(0, 4)}-${digits.slice(4)}`
    }
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
  }

  const nativePickerAvailable = Platform.OS !== 'web' && NativeDateTimePicker != null

  const parseISODateString = (value: string) => {
    if (!value || value.length !== 10) {
      return null
    }

    const [yearRaw, monthRaw, dayRaw] = value.split('-')
    const year = Number(yearRaw)
    const month = Number(monthRaw)
    const day = Number(dayRaw)

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null
    }

    const parsed = new Date(year, month - 1, day)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const commitNativeDate = (target: 'filter' | 'form', date: Date) => {
    const isoValue = date.toISOString().split('T')[0]
    if (target === 'filter') {
      setFilterDate(isoValue)
    } else {
      setFormAppointmentDate(isoValue)
    }
  }

  const openNativeDatePicker = (target: 'filter' | 'form') => {
    if (!nativePickerAvailable || Platform.OS === 'web') {
      return
    }

    const currentValue = target === 'filter' ? filterDate : formAppointmentDate
    const baseDate = parseISODateString(currentValue) ?? new Date()

    if (Platform.OS === 'android' && NativeDateTimePickerAndroid?.open) {
      NativeDateTimePickerAndroid.open({
        mode: 'date',
        value: baseDate,
        onChange: (_event: unknown, selectedDate?: Date) => {
          if (selectedDate) {
            commitNativeDate(target, selectedDate)
          }
        },
      })
      return
    }

    setPendingNativeDate(baseDate)
    setActiveNativePicker(target)
  }

  const closeNativeDatePicker = () => {
    setActiveNativePicker(null)
  }

  const handleIOSNativeDateChange = (_event: unknown, selectedDate?: Date) => {
    if (selectedDate) {
      setPendingNativeDate(selectedDate)
    }
  }

  const confirmIOSNativeDate = () => {
    if (activeNativePicker) {
      commitNativeDate(activeNativePicker, pendingNativeDate)
      setActiveNativePicker(null)
    }
  }

  const formatControlDate = (value: string) => {
    if (!value) {
      return null
    }
    return value.length === 10 ? formatDisplayDate(value) : value
  }

  const renderSelectionControl = (
    checked: boolean,
    onPress: () => void,
    accessibilityLabel: string,
    extraStyle?: object,
  ) => (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectionCheckbox,
        checked && styles.selectionCheckboxChecked,
        pressed && styles.selectionCheckboxPressed,
        extraStyle,
      ]}
    >
      {checked && <Feather name="check" size={14} color="#FFFFFF" />}
    </Pressable>
  )

  type DateFieldVariant = 'filter' | 'form'
  type DateFieldConfig = {
    value: string
    onChange: (next: string) => void
    placeholder: string
    variant: DateFieldVariant
    icon: React.ReactNode
    allowClear?: boolean
    disabled?: boolean
    labelId: string
    useNativePicker: boolean
    onOpenNativePicker?: () => void
  }

  const DateField = ({
    value,
    onChange,
    placeholder,
    variant,
    icon,
    allowClear,
    disabled = false,
    labelId,
    useNativePicker,
    onOpenNativePicker,
  }: DateFieldConfig) => {
    const webInputRef = useRef<any>(null)

    if (Platform.OS === 'web') {
      ensureWebDateInputStyles()
    }

    const handleChange = (next: string) => {
      if (disabled) {
        return
      }
      const sanitized = sanitizeDateInput(next)
      onChange(sanitized)
    }

    const handleClear = (event?: { stopPropagation?: () => void }) => {
      event?.stopPropagation?.()
      handleChange('')
    }

    const showClear = Boolean(allowClear && value.length > 0)
    const labelStyle =
      value.length > 0
        ? styles.dateLabelFilled
        : variant === 'filter'
          ? styles.filterPlaceholder
          : styles.formPlaceholder
    const displayValue = value.length > 0 ? formatControlDate(value) ?? value : placeholder

    if (Platform.OS === 'web') {
      const handleWebPress = () => {
        if (disabled) {
          return
        }
        const node = webInputRef.current
        node?.showPicker?.()
        node?.focus?.()
      }

      return (
        <Pressable
          onPress={handleWebPress}
          accessibilityRole="button"
          disabled={disabled}
          style={[
            variant === 'filter' ? styles.filterInput : styles.formInput,
            styles.dateInputContainer,
            disabled && styles.dateInputDisabled,
          ]}
        >
          <View style={styles.dateInputLabelWrapper} pointerEvents="none">
            <Text style={labelStyle}>{displayValue}</Text>
          </View>
          <View
            pointerEvents="box-none"
            style={[
              variant === 'filter' ? styles.filterInputIcons : null,
              styles.dateInputIconRow,
            ]}
          >
            {showClear && !disabled && (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation()
                  handleClear()
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather name="x" size={16} color="#C0CADB" />
              </Pressable>
            )}
            {icon}
          </View>
          <input
            ref={webInputRef}
            type="date"
            value={value || ''}
            onChange={(event) => handleChange(event.target.value)}
            disabled={disabled}
            aria-labelledby={labelId}
            aria-label={placeholder}
            title={placeholder}
            className={WEB_DATE_INPUT_CLASS}
          />
        </Pressable>
      )
    }

    if (useNativePicker && onOpenNativePicker) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={placeholder}
          onPress={onOpenNativePicker}
          disabled={disabled}
          style={[
            variant === 'filter' ? styles.filterInput : styles.formInput,
            styles.dateInputContainer,
            disabled && styles.dateInputDisabled,
          ]}
        >
          <View style={styles.dateInputLabelWrapper} pointerEvents="none">
            <Text style={labelStyle}>{displayValue}</Text>
          </View>
          <View style={styles.dateInputIconRow}>
            {showClear && !disabled && (
              <Pressable
                onPress={handleClear}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather name="x" size={16} color="#C0CADB" />
              </Pressable>
            )}
            {icon}
          </View>
        </Pressable>
      )
    }

    return (
      <View
        style={[
          variant === 'filter' ? styles.filterInput : styles.formInput,
          styles.dateInputContainer,
          disabled && styles.dateInputDisabled,
        ]}
      >
        <View style={styles.dateInputLabelWrapper} pointerEvents="none">
          <Text style={labelStyle}>{displayValue}</Text>
        </View>
        <View
          style={[
            variant === 'filter' ? styles.filterInputIcons : null,
            styles.dateInputIconRow,
          ]}
        >
          {showClear && !disabled && (
            <Pressable
              onPress={handleClear}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Feather name="x" size={16} color="#C0CADB" />
            </Pressable>
          )}
          {icon}
        </View>
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#8EA2C0"
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          autoCorrect={false}
          autoCapitalize="none"
          editable={!disabled}
          accessibilityLabel={placeholder}
          style={styles.dateInputNativeFallback}
        />
      </View>
    )
  }

  // Renders the inline view/print buttons with hover state parity to the design spec.
  const renderPrimaryActions = (appointment: AppointmentRow) => (
    <View style={styles.primaryActionRow}>
      <Pressable
        onPress={() => handleViewAppointment(appointment)}
        style={({ hovered, pressed }) => [
          styles.primaryActionLeft,
          (hovered || pressed) && styles.primaryActionHover,
          pressed && styles.primaryActionPressed,
        ]}
      >
        {({ hovered, pressed }) => (
          <Feather
            name="eye"
            size={14}
            color={hovered || pressed ? '#FFFFFF' : '#2F6FE1'}
          />
        )}
      </Pressable>
      <Pressable
        onPress={() => handlePrintAppointment(appointment)}
        style={({ hovered, pressed }) => [
          styles.primaryActionRight,
          (hovered || pressed) && styles.primaryActionHover,
          pressed && styles.primaryActionPressed,
        ]}
      >
        {({ hovered, pressed }) => (
          <Feather
            name="printer"
            size={14}
            color={hovered || pressed ? '#FFFFFF' : '#2F6FE1'}
          />
        )}
      </Pressable>
    </View>
  )

  // Renders the delete button with hover transition to solid red background.
  const renderDeleteAction = (appointment: AppointmentRow) => (
    <Pressable
      onPress={() => handleDeleteAppointment(appointment)}
      style={({ hovered, pressed }) => [
        styles.dangerActionButton,
        (hovered || pressed) && styles.dangerActionHover,
        pressed && styles.dangerActionPressed,
      ]}
    >
      {({ hovered, pressed }) => (
        <Feather
          name="trash-2"
          size={14}
          color={hovered || pressed ? '#FFFFFF' : '#E32828'}
        />
      )}
    </Pressable>
  )

  // When available rows shrink below the threshold reset bulk delete state.
  useEffect(() => {
    if (!showBulkDeleteAction && bulkDeleteEnabled) {
      setBulkDeleteEnabled(false)
      setSelectedAppointmentIds([])
    }
  }, [showBulkDeleteAction, bulkDeleteEnabled])

  useEffect(() => {
    setSelectedAppointmentIds((current) => {
      if (current.length === 0) {
        return current
      }
      const available = new Set(filteredAppointments.map((appointment) => appointment.id))
      const next = current.filter((id) => available.has(id))
      return next.length === current.length ? current : next
    })
  }, [filteredAppointments])

  // Animate filter panel whenever expansion state changes and we know its height.
  useEffect(() => {
    if (measuredFilterHeight === 0) {
      return
    }

    Animated.timing(filterAnimation, {
      toValue: filtersExpanded ? 1 : 0,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [filtersExpanded, measuredFilterHeight, filterAnimation])

  const animatedFilterStyle = useMemo(
    () => ({
      height: filterAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, measuredFilterHeight || 0.1],
      }),
      opacity: filterAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
      transform: [
        {
          scaleY: filterAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.95, 1],
          }),
        },
      ],
    }),
    [filterAnimation, measuredFilterHeight],
  )

  useEffect(() => {
    if (measuredFormHeight === 0) {
      return
    }

    // Animate create/edit form panel.
    Animated.timing(formAnimation, {
      toValue: formExpanded ? 1 : 0,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [formExpanded, measuredFormHeight, formAnimation])

  const animatedFormStyle = useMemo(
    () => ({
      height: formAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, measuredFormHeight || 0.1],
      }),
      opacity: formAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
      transform: [
        {
          scaleY: formAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.95, 1],
          }),
        },
      ],
    }),
    [formAnimation, measuredFormHeight],
  )

  // Backend integration: swap placeholders with real dropdown values once filter endpoints exist.
  const renderFilterFields = (interactive: boolean) => {
    const statusDisplayLabel =
      filterStatus === 'all' ? 'Select status' : getStatusOptionLabel(filterStatus)
    const patientDisplayLabel =
      filterPatient === 'all' ? 'Patient' : getPatientOptionLabel(filterPatient)
    const doctorDisplayLabel =
      filterDoctor === 'all' ? 'Select doctor' : getDoctorOptionLabel(filterDoctor)

    return (
      <View style={styles.filterContent}>
        {/* Top filter row: core controls for date, patient, and status. */}
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <Text nativeID="appointments-filter-date-label" style={styles.filterLabel}>
              Select Date
            </Text>
            <DateField
              value={filterDate}
              onChange={setFilterDate}
              placeholder="Date"
              variant="filter"
              icon={<Feather name="chevron-down" size={18} color="#3A6B9C" />}
              allowClear
              labelId="appointments-filter-date-label"
              useNativePicker={nativePickerAvailable}
              onOpenNativePicker={() => openNativeDatePicker('filter')}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Select Patient</Text>
            <Pressable
              ref={interactive ? filterPatientButtonRef : undefined}
              style={({ pressed }) => [
                styles.filterInput,
                pressed && interactive && styles.filterInputPressed,
              ]}
              onPress={interactive ? () => openPicker('filter-patient') : undefined}
              accessibilityRole="button"
              accessibilityLabel="Select patient filter"
            >
              <Text style={filterPatient === 'all' ? styles.filterPlaceholder : styles.filterValue}>
                {patientDisplayLabel}
              </Text>
              <View style={styles.filterInputIcons}>
                {filterPatient !== 'all' &&
                  (interactive ? (
                    <Pressable
                      onPress={handleClearFilterPatient}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Feather name="x" size={16} color="#C0CADB" />
                    </Pressable>
                  ) : (
                    <View pointerEvents="none">
                      <Feather name="x" size={16} color="#C0CADB" />
                    </View>
                  ))}
                <Feather name="chevron-down" size={18} color="#3A6B9C" />
              </View>
            </Pressable>
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Select status</Text>
            <Pressable
              ref={interactive ? filterStatusButtonRef : undefined}
              style={({ pressed }) => [
                styles.filterInput,
                pressed && interactive && styles.filterInputPressed,
              ]}
              onPress={interactive ? () => openPicker('filter-status') : undefined}
              accessibilityRole="button"
              accessibilityLabel="Select status filter"
            >
              <Text style={filterStatus === 'all' ? styles.filterPlaceholder : styles.filterValue}>
                {statusDisplayLabel}
              </Text>
              <View style={styles.filterInputIcons}>
                {filterStatus !== 'all' &&
                  (interactive ? (
                    <Pressable
                      onPress={handleClearFilterStatus}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Feather name="x" size={16} color="#C0CADB" />
                    </Pressable>
                  ) : (
                    <View pointerEvents="none">
                      <Feather name="x" size={16} color="#C0CADB" />
                    </View>
                  ))}
                <Feather name="chevron-down" size={18} color="#3A6B9C" />
              </View>
            </Pressable>
          </View>
        </View>
        {/* Second filter row: doctor selector stands alone on larger screens. */}
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Select doctor</Text>
            <Pressable
              ref={interactive ? filterDoctorButtonRef : undefined}
              style={({ pressed }) => [
                styles.filterInput,
                pressed && interactive && styles.filterInputPressed,
              ]}
              onPress={interactive ? () => openPicker('filter-doctor') : undefined}
              accessibilityRole="button"
              accessibilityLabel="Select doctor filter"
            >
              <Text style={filterDoctor === 'all' ? styles.filterPlaceholder : styles.filterValue}>
                {doctorDisplayLabel}
              </Text>
              <View style={styles.filterInputIcons}>
                {filterDoctor !== 'all' &&
                  (interactive ? (
                    <Pressable
                      onPress={handleClearFilterDoctor}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Feather name="x" size={16} color="#C0CADB" />
                    </Pressable>
                  ) : (
                    <View pointerEvents="none">
                      <Feather name="x" size={16} color="#C0CADB" />
                    </View>
                  ))}
                <Feather name="chevron-down" size={18} color="#3A6B9C" />
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    )
  }

  // Backend integration: populate these form controls with live doctor/patient/service lists.
  const renderFormFields = (interactive: boolean) => {
    const doctorDisplayLabel = formDoctor ? getDoctorOptionLabel(formDoctor) : 'Select doctor'
    const patientDisplayLabel = formPatient ? getPatientOptionLabel(formPatient) : 'Select patient'
    const statusDisplayLabel = getStatusOptionLabel(formStatus)

    return (
      <View style={styles.formContent}>
        <View style={styles.formRow}>
          <View style={styles.formColumn}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>
                Doctor <Text style={styles.requiredMark}>*</Text>
              </Text>
              <Pressable
                ref={interactive ? formDoctorButtonRef : undefined}
                style={({ pressed }) => [
                  styles.formInput,
                  pressed && interactive && styles.formInputPressed,
                ]}
                onPress={interactive ? () => openPicker('form-doctor') : undefined}
                accessibilityRole="button"
                accessibilityLabel="Select doctor"
              >
                <Text style={formDoctor ? styles.formValue : styles.formPlaceholder}>
                  {doctorDisplayLabel}
                </Text>
                <Feather name="chevron-down" size={18} color="#3A6B9C" />
              </Pressable>
            </View>

            <View style={styles.formField}>
              <View style={styles.formLabelRow}>
                <Text style={styles.formLabel}>
                  Service <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TouchableOpacity disabled={!interactive}>
                  <Text style={styles.inlineLink}>+ Add Service</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.formInput}
                onPress={interactive ? () => {} : undefined}
                activeOpacity={interactive ? 0.7 : 1}
              >
                <Text style={styles.formPlaceholder}>Search</Text>
                <Feather name="chevron-down" size={18} color="#3A6B9C" />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text nativeID="appointments-form-date-label" style={styles.formLabel}>
                Appointment Date <Text style={styles.requiredMark}>*</Text>
              </Text>
              <DateField
                value={formAppointmentDate}
                onChange={setFormAppointmentDate}
                placeholder="DD-MM-YYYY"
                variant="form"
                icon={<Feather name="calendar" size={18} color="#3A6B9C" />}
                disabled={!interactive}
                useNativePicker={nativePickerAvailable}
                onOpenNativePicker={() => openNativeDatePicker('form')}
                labelId="appointments-form-date-label"
              />
            </View>

            <View style={styles.formField}>
              <View style={styles.formLabelRow}>
                <Text style={styles.formLabel}>
                  Patient <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TouchableOpacity disabled={!interactive}>
                  <Text style={styles.inlineLink}>+ Add patient</Text>
                </TouchableOpacity>
              </View>
              <Pressable
                ref={interactive ? formPatientButtonRef : undefined}
                style={({ pressed }) => [
                  styles.formInput,
                  pressed && interactive && styles.formInputPressed,
                ]}
                onPress={interactive ? () => openPicker('form-patient') : undefined}
                accessibilityRole="button"
                accessibilityLabel="Select patient"
              >
                <Text style={formPatient ? styles.formValue : styles.formPlaceholder}>
                  {patientDisplayLabel}
                </Text>
                <Feather name="chevron-down" size={18} color="#3A6B9C" />
              </Pressable>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>
                Status <Text style={styles.requiredMark}>*</Text>
              </Text>
              <Pressable
                ref={interactive ? formStatusButtonRef : undefined}
                style={({ pressed }) => [
                  styles.formInput,
                  pressed && interactive && styles.formInputPressed,
                ]}
                onPress={interactive ? () => openPicker('form-status') : undefined}
                accessibilityRole="button"
                accessibilityLabel="Select appointment status"
              >
                <Text style={styles.formValue}>{statusDisplayLabel}</Text>
                <Feather name="chevron-down" size={18} color="#3A6B9C" />
              </Pressable>
            </View>
          </View>

          <View style={styles.formColumn}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>
                Available Slot <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={styles.slotBox}>
                <Text style={styles.slotPlaceholder}>No time slots found</Text>
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Service Detail</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoPlaceholder}>No service detail found..</Text>
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Tax</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoPlaceholder}>No tax found.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.formActions}>
          {interactive ? (
            <>
              <PageActionButton
                label="Save"
                onPress={() => {}}
                icon={<Feather name="save" size={18} color="#FFFFFF" />}
              />
              <TouchableOpacity style={styles.cancelButton} onPress={toggleForm}>
                <Text style={styles.cancelButtonLabel}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.formActionsMeasure} />
          )}
        </View>
      </View>
    )
  }

  const renderPickerModal = () => {
    if (!pickerTarget) {
      return null
    }

    let options: Array<{ value: string; label: string }>
    let selectedValue: string

    switch (pickerTarget) {
      case 'filter-status':
        options = FILTER_STATUS_OPTIONS
        selectedValue = filterStatus
        break
      case 'form-status':
        options = FORM_STATUS_OPTIONS
        selectedValue = formStatus
        break
      case 'filter-patient':
        options = [...FILTER_PATIENT_OPTIONS]
        selectedValue = filterPatient === 'all' ? '' : filterPatient
        break
      case 'filter-doctor':
        options = [...FILTER_DOCTOR_OPTIONS]
        selectedValue = filterDoctor === 'all' ? '' : filterDoctor
        break
      case 'form-patient':
        options = [...PATIENT_OPTIONS]
        selectedValue = formPatient ?? ''
        break
      case 'form-doctor':
        options = [...DOCTOR_OPTIONS]
        selectedValue = formDoctor ?? ''
        break
      default:
        options = []
        selectedValue = ''
        break
    }

    if (options.length === 0) {
      return null
    }

    const cardStyle: Array<object> = [styles.statusPickerCard]
    if (pickerPosition) {
      const dropdownWidth = Math.max(pickerPosition.width, 220)
      const constrainedWidth = Math.min(dropdownWidth, 320)
      const maxLeft = width - constrainedWidth - Styles.spacing.sm
      const clampedLeft = Math.max(Styles.spacing.sm, Math.min(pickerPosition.x, maxLeft))
      cardStyle.push({
        top: pickerPosition.y + pickerPosition.height + 6,
        left: clampedLeft,
        width: constrainedWidth,
      })
    } else {
      cardStyle.push(styles.statusPickerCardCentered)
    }

    return (
      <Modal visible transparent animationType="fade" onRequestClose={closePicker}>
        <View style={styles.statusPickerBackdrop}>
          <Pressable style={styles.statusPickerDismiss} onPress={closePicker} />
          <View style={cardStyle}>
            {options.map((option) => {
              const isSelected = option.value === selectedValue
              return (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [
                    styles.statusPickerOption,
                    isSelected && styles.statusPickerOptionSelected,
                    pressed && !isSelected && styles.statusPickerOptionPressed,
                  ]}
                  onPress={() => handlePickerSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.statusPickerOptionLabel,
                      isSelected && styles.statusPickerOptionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <SafeAreaView style={Styles.mainScreen}>
      {/* Scroll container holds entire screen sections (filters → table → modal triggers). */}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          isMediumScreen && styles.contentContainerMedium,
          isSmallScreen && styles.contentContainerSmall,
        ]}
      >
        {/* Filter panel: allows clinicians to narrow appointment list. */}
        <Card
          style={[
            styles.filterCard,
            isMediumScreen && styles.filterCardMedium,
            isSmallScreen && styles.filterCardSmall,
          ]}
        >
          <View
            style={[
              styles.filterHeader,
              isSmallScreen && styles.filterHeaderSmall,
            ]}
          >
            <Text style={styles.sectionTitle}>Filters</Text>
            <PageActionButton
              label={filtersExpanded ? 'Close filter' : 'Apply filters'}
              onPress={toggleFilters}
              icon={
                <Feather
                  name={filtersExpanded ? 'minus' : 'plus'}
                  size={18}
                  color="#FFFFFF"
                />
              }
            />
          </View>

          <Animated.View
            style={[styles.filterContentWrapper, animatedFilterStyle]}
            pointerEvents={filtersExpanded ? 'auto' : 'none'}
          >
            {renderFilterFields(true)}
          </Animated.View>

          <View
            style={styles.filterMeasure}
            pointerEvents="none"
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout
              if (height !== measuredFilterHeight) {
                setMeasuredFilterHeight(height)
              }
            }}
          >
            {renderFilterFields(false)}
          </View>
        </Card>

        {/* Primary appointments card: action bar, segment control, form, and table. */}
        <Card
          style={[
            styles.appointmentCard,
            isMediumScreen && styles.appointmentCardMedium,
            isSmallScreen && styles.appointmentCardSmall,
          ]}
        >
          <View
            style={[
              styles.appointmentHeader,
              isSmallScreen && styles.appointmentHeaderSmall,
            ]}
          >
            <Text style={styles.sectionTitle}>Appointment</Text>
            {/* Header row: actions adapt based on available data (bulk delete, add, import, export). */}
            {/* Desktop header row hidden for stacked mobile cards. */}
            <View
              style={[
                styles.appointmentActions,
                isSmallScreen && styles.appointmentActionsSmall,
              ]}
            >
              {bulkDeleteActive && anySelected && (
                <TouchableOpacity
                  style={[styles.bulkDeleteButton, styles.bulkDeleteSelectedButton]}
                  onPress={handleDeleteSelectedAppointments}
                  activeOpacity={0.85}
                >
                  <Feather name="trash-2" size={18} color="#FFFFFF" />
                  <Text style={styles.bulkDeleteButtonLabel}>Delete selected appointment</Text>
                </TouchableOpacity>
              )}
              {/* Bulk delete toggle (only when multiple appointments are present). */}
              {showBulkDeleteAction && (
                <TouchableOpacity
                  style={[
                    styles.bulkDeleteButton,
                    bulkDeleteEnabled && styles.bulkDeleteButtonActive,
                  ]}
                  onPress={toggleBulkDeleteMode}
                  activeOpacity={0.85}
                >
                  <Feather name="trash-2" size={18} color="#FFFFFF" />
                  <Text style={styles.bulkDeleteButtonLabel}>
                    {bulkDeleteEnabled ? 'Disable multiple delete' : 'Enable multiple delete'}
                  </Text>
                </TouchableOpacity>
              )}
              {/* Entry point for adding a single appointment. */}
              <PageActionButton
                label={formExpanded ? 'Close form' : 'Add appointment'}
                onPress={toggleForm}
                icon={
                  <Feather
                    name={formExpanded ? 'minus' : 'plus'}
                    size={18}
                    color="#FFFFFF"
                  />
                }
              />
              {/* Import shortcut for processing CSV uploads. */}
              <PageActionButton
                label="Import data"
                onPress={openImport}
                icon={<Feather name="upload-cloud" size={18} color="#FFFFFF" />}
              />
              {/* Export buttons: emit CSV/Excel/PDF files for the visible dataset. */}
              {showExportButtons && (
                <View style={styles.exportButtonsContainer}>
                  {EXPORT_OPTIONS.map((option) => {
                    const isHovered = hoveredExport === option.id

                    return (
                      <View key={option.id} style={styles.exportButtonWrapper}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={option.label}
                          onPress={() => handleExport(option.id)}
                          onHoverIn={() => setHoveredExport(option.id)}
                          onHoverOut={() =>
                            setHoveredExport((current) => (current === option.id ? null : current))
                          }
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={({ hovered, pressed }) => [
                            styles.exportIconBase,
                            (hovered || isHovered) && styles.exportIconHover,
                            pressed && styles.exportIconPressed,
                          ]}
                        >
                          <Feather name={option.icon} size={18} color="#2F6FE1" />
                        </Pressable>
                        {isHovered && (
                          <View style={styles.exportTooltipContainer}>
                            <View style={styles.exportTooltipShell}>
                              <Text numberOfLines={1} style={styles.exportTooltipLabel}>
                                {option.label}
                              </Text>
                            </View>
                            <View style={styles.exportTooltipCaret} />
                          </View>
                        )}
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          </View>

          {/* Segment control toggles between all/upcoming/past data views. */}
          <SegmentedControl
            style={styles.segmentedControl}
            options={SEGMENTS.map((segment) => SEGMENT_LABELS[segment])}
            selectedIndex={selectedSegment}
            onChange={setSelectedSegment}
          />

          {/* Collapsible appointment form for scheduling new visits. */}
          <Animated.View
            style={[styles.formContentWrapper, animatedFormStyle]}
            pointerEvents={formExpanded ? 'auto' : 'none'}
          >
            {renderFormFields(true)}
          </Animated.View>

          {/* Hidden measure view calculates full height for animation. */}
          <View
            style={styles.formMeasure}
            pointerEvents="none"
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout
              if (height !== measuredFormHeight) {
                setMeasuredFormHeight(height)
              }
            }}
          >
            {renderFormFields(false)}
          </View>

          {/* Results list: renders either header+table rows or stacked mobile cards. */}
          <View style={[styles.tableContainer, isSmallScreen && styles.tableContainerSmall]}>
            <View
              style={[
                styles.tableHeaderRow,
                isSmallScreen && styles.tableHeaderRowHidden,
              ]}
            >
              {bulkDeleteActive && (
                <View style={styles.selectionHeaderCell}>
                  {renderSelectionControl(
                    allSelected,
                    toggleSelectAll,
                    allSelected ? 'Deselect all appointments' : 'Select all appointments',
                    styles.selectionCheckboxHeader,
                  )}
                </View>
              )}
              <Text style={[styles.tableHeaderText, styles.tableHeaderPatient]}>Patient Name</Text>
              <Text style={[styles.tableHeaderText, styles.tableHeaderService]}>Services</Text>
              <Text style={[styles.tableHeaderText, styles.tableHeaderCharges]}>Charges</Text>
              <Text style={[styles.tableHeaderText, styles.tableHeaderPayment]}>Payment Mode</Text>
              <Text style={[styles.tableHeaderText, styles.tableHeaderStatus]}>Status</Text>
              <Text style={[styles.tableHeaderText, styles.tableHeaderAction]}>Action</Text>
            </View>

            {isSmallScreen && bulkDeleteActive && (
              <View style={styles.mobileSelectAllRow}>
                {renderSelectionControl(
                  allSelected,
                  toggleSelectAll,
                  allSelected ? 'Deselect all appointments' : 'Select all appointments',
                )}
                <Text style={styles.mobileSelectAllLabel}>Select all</Text>
              </View>
            )}

            {filteredAppointments.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateTitle}>No appointments found</Text>
              </View>
            ) : (
              filteredAppointments.map((appointment) => {
                const isSelected = selectedAppointmentIds.includes(appointment.id)
                const statusPalette = STATUS_STYLES[appointment.status] ?? STATUS_STYLES.Booked
                const formattedDate = formatDisplayDate(appointment.schedule.date)
                const appointmentWindow = buildTimeWindow(appointment.schedule)
                const chargeLabel = formatChargeLabel(appointment.charges)

                if (isSmallScreen) {
                  return (
                    <View key={appointment.id} style={styles.mobileCard}>
                      {/* Mobile layout: stacked card mirroring desktop information density. */}
                      <View style={styles.mobileCardHeader}>
                        {bulkDeleteActive && (
                          <View style={styles.selectionCellMobile}>
                            {renderSelectionControl(
                              isSelected,
                              () => toggleSelectAppointment(appointment.id),
                              isSelected
                                ? 'Deselect appointment'
                                : 'Select appointment',
                            )}
                          </View>
                        )}
                        <View style={styles.patientAvatar}>
                          <Text style={styles.patientAvatarLabel}>{appointment.patient.initials}</Text>
                        </View>
                        <View style={styles.mobileCardHeaderText}>
                          <Text style={styles.appointmentDateLabel}>{formattedDate}</Text>
                          <Text style={styles.patientNameLabel}>
                            {appointment.patient.name} ({appointmentWindow})
                          </Text>
                        </View>
                      </View>

                      <View style={styles.mobileInfoBlock}>
                        {/* Doctor and description details render as lines. */}
                        <Text style={styles.mobileDetailText}>
                          <Text style={styles.detailLabel}>Doctor : </Text>
                          {appointment.provider}
                        </Text>
                        <Text style={styles.mobileDetailText}>
                          <Text style={styles.detailLabel}>Description : </Text>
                          {appointment.description || 'No Records Found'}
                        </Text>
                        <Text style={styles.mobileDetailHighlight}>{appointment.service}</Text>
                        <Text style={styles.mobileDetailValue}>{chargeLabel}</Text>
                        <Text style={styles.mobileDetailValue}>{appointment.paymentMode}</Text>
                      </View>

                      <View style={styles.mobileFooterRow}>
                        {/* Status badge reused from desktop styles. */}
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusPalette.background },
                          ]}
                        >
                          <Text style={[styles.statusBadgeText, { color: statusPalette.color }]}>
                            {appointment.status}
                          </Text>
                        </View>
                        {/* Action column anchored left (delete below inline actions). */}
                        <View style={styles.mobileActionsColumn}>
                          {renderPrimaryActions(appointment)}
                          <View style={styles.actionSpacerVertical} />
                          {renderDeleteAction(appointment)}
                        </View>
                      </View>
                    </View>
                  )
                }

                return (
                  // Desktop/tablet row layout: six-column summary with action column.
                  <View key={appointment.id} style={styles.tableRow}>
                    {bulkDeleteActive && (
                      <View style={styles.selectionCell}>
                        {renderSelectionControl(
                          isSelected,
                          () => toggleSelectAppointment(appointment.id),
                          isSelected ? 'Deselect appointment' : 'Select appointment',
                        )}
                      </View>
                    )}
                    {/* Patient column: avatar, date, patient/doctor details. */}
                    <View style={styles.rowPatientColumn}>
                      <View style={styles.patientAvatar}>
                        <Text style={styles.patientAvatarLabel}>{appointment.patient.initials}</Text>
                      </View>
                      <View style={styles.patientDetails}>
                        <Text style={styles.appointmentDateLabel}>{formattedDate}</Text>
                        <Text style={styles.patientNameLabel}>
                          {appointment.patient.name} ({appointmentWindow})
                        </Text>
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabel}>Doctor : </Text>
                          {appointment.provider}
                        </Text>
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabel}>Description : </Text>
                          {appointment.description || 'No Records Found'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rowServiceColumn}>
                      <Text style={styles.serviceText}>{appointment.service}</Text>
                    </View>

                    {/* Charge column: currency formatted total. */}
                    <View style={styles.rowChargesColumn}>
                      <Text style={styles.chargeText}>{chargeLabel}</Text>
                    </View>

                    {/* Payment column: manual / insurance / etc. */}
                    <View style={styles.rowPaymentColumn}>
                      <Text style={styles.paymentModeText}>{appointment.paymentMode}</Text>
                    </View>

                    {/* Status chip column: color-coded per status. */}
                    <View style={styles.rowStatusColumn}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusPalette.background },
                        ]}
                      >
                        <Text
                          style={[styles.statusBadgeText, { color: statusPalette.color }]}
                        >
                          {appointment.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rowActionColumn}>
                      {/* Inline actions (view/print). */}
                      {renderPrimaryActions(appointment)}
                      <View style={styles.actionSpacerVertical} />
                      {/* Secondary action (delete). */}
                      {renderDeleteAction(appointment)}
                    </View>
                  </View>
                )
              })
            )}
          </View>
        </Card>
      </ScrollView>
      {renderPickerModal()}

      {/* Import modal: guides users through CSV upload workflow. */}
      <Modal visible={importVisible} transparent animationType="fade" onRequestClose={closeImport}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              {/* Modal header with title and close affordance. */}
              <Text style={styles.modalTitle}>Appointments Import</Text>
              <TouchableOpacity
                onPress={closeImport}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={20} color="#1F3D6E" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* File selection controls. */}
              <View style={styles.modalFieldRow}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Select type</Text>
                  <TouchableOpacity style={styles.modalInput} onPress={() => { }}>
                    <Text style={styles.modalPlaceholder}>Select type</Text>
                    <Feather name="chevron-down" size={18} color="#3A6B9C" />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Upload File</Text>
                  <View style={styles.uploadRow}>
                    <Pressable style={styles.uploadButton}>
                      <Feather name="upload" size={18} color="#FFFFFF" />
                      <Text style={styles.uploadButtonLabel}>Choose file</Text>
                    </Pressable>
                    <View style={styles.uploadFileName}>
                      <Text style={styles.modalPlaceholder}>No file Chosen</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Resource link for sample CSV template. */}
              <TouchableOpacity style={styles.sampleLinkRow}>
                <Text style={styles.sampleLink}>Click here to download sample file</Text>
              </TouchableOpacity>

              {/* CSV validation hint list. */}
              <View style={styles.modalNoteBlock}>
                <Text style={styles.noteHeading}>Following field is required in csv file</Text>
                <View style={styles.noteList}>
                  {[
                    'date (date should be less than current date)',
                    'Start time',
                    'End time',
                    'Service',
                    'Clinic name',
                    'Doctor name',
                    'Patient name',
                    'Status',
                  ].map((item) => (
                    <View key={item} style={styles.noteItem}>
                      <View style={styles.noteBullet} />
                      <Text style={styles.noteText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              {/* Submit + cancel controls for import flow. */}
              <PageActionButton
                label="Save"
                onPress={() => { }}
                icon={<Feather name="save" size={18} color="#FFFFFF" />}
              />
              <TouchableOpacity style={styles.modalCancelButton} onPress={closeImport}>
                <Text style={styles.modalCancelLabel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {nativePickerAvailable &&
        Platform.OS === 'ios' &&
        activeNativePicker &&
        NativeDateTimePicker && (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={closeNativeDatePicker}
          >
            <Pressable style={styles.nativeDatePickerBackdrop} onPress={closeNativeDatePicker}>
              <Pressable
                onPress={(event) => event.stopPropagation()}
                style={styles.nativeDatePickerCard}
              >
                <NativeDateTimePicker
                  value={pendingNativeDate}
                  mode="date"
                  display="spinner"
                  onChange={handleIOSNativeDateChange}
                  style={styles.nativeDatePicker}
                />
                <View style={styles.nativeDatePickerActions}>
                  <TouchableOpacity
                    style={styles.nativeDatePickerButtonGhost}
                    onPress={closeNativeDatePicker}
                  >
                    <Text style={styles.nativeDatePickerButtonGhostLabel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nativeDatePickerButton}
                    onPress={confirmIOSNativeDate}
                  >
                    <Text style={styles.nativeDatePickerButtonLabel}>Done</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}
      {/* Detail modal: surfaces read-only appointment snapshot. */}
      <Modal
        visible={selectedAppointment !== null}
        transparent
        animationType="fade"
        onRequestClose={closeAppointmentDetails}
      >
        <View style={styles.detailsModalBackdrop}>
          <View style={styles.detailsModalContainer}>
            <View style={styles.detailsModalHeader}>
              <Text style={styles.detailsModalTitle}>Appointment details</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close appointment details"
                onPress={closeAppointmentDetails}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.detailsModalClose}
              >
                <Feather name="x" size={20} color="#1F3D6E" />
              </Pressable>
            </View>

            {selectedAppointment && (
              <View style={styles.detailsModalBody}>
                {/* Backend integration: hydrate these key/value pairs with full appointment payload. */}
                {[
                  {
                    left: {
                      label: 'Date :',
                      value: formatDisplayDate(selectedAppointment.schedule.date),
                    },
                    right: {
                      label: 'Time :',
                      value: selectedAppointment.schedule.startTime,
                    },
                  },
                  {
                    left: {
                      label: 'Doctor :',
                      value: selectedAppointment.provider,
                    },
                    right: {
                      label: 'Patient :',
                      value: selectedAppointment.patient.name,
                    },
                  },
                  {
                    left: {
                      label: 'Clinic :',
                      value: selectedAppointment.clinic || '—',
                    },
                    right: {
                      label: 'Patient Contact :',
                      value: selectedAppointment.patientContact || '—',
                    },
                  },
                  {
                    left: {
                      label: 'Appointment type :',
                      value: selectedAppointment.service,
                    },
                    right: {
                      label: 'Charges :',
                      value: formatChargeLabel(selectedAppointment.charges),
                    },
                  },
                  {
                    left: {
                      label: 'Status :',
                      value: selectedAppointment.status,
                      highlight: true,
                      statusKey: selectedAppointment.status,
                    },
                    right: {
                      label: 'Payment Mode :',
                      value: selectedAppointment.paymentMode,
                    },
                  },
                ].map((row) => (
                  <View key={row.left.label} style={styles.detailRowOuter}>
                    <View style={styles.detailsColumn}>
                      {renderDetailValue(
                        row.left.label,
                        row.left.value,
                        row.left.highlight,
                        row.left.statusKey,
                      )}
                    </View>
                    <View style={styles.detailsColumn}>
                      {renderDetailValue(
                        row.right.label,
                        row.right.value,
                      )}
                    </View>
                  </View>
                ))}

                <View style={styles.detailsFooter}>
                  <Text style={styles.detailsFooterTitle}>Extra detail</Text>
                  {/* Backend integration: populate audit trail entries from history endpoint. */}
                  {chunkAuditTrail(selectedAppointment.auditTrail ?? ['—']).map(
                    ([left, right], index) => (
                      <View key={`${left}-${index}`} style={styles.detailsFooterRow}>
                        <Text style={styles.detailsFooterItem}>{left}</Text>
                        <Text style={styles.detailsFooterItem}>{right}</Text>
                      </View>
                    ),
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

// ------------------------------
// Style declarations: grouped roughly in render order (container → cards → modals).
// ------------------------------
const styles = StyleSheet.create({
  contentContainer: {
    padding: Styles.spacing.xl,
    gap: Styles.spacing.lg,
  },
  contentContainerMedium: {
    paddingHorizontal: Styles.spacing.lg,
  },
  contentContainerSmall: {
    paddingHorizontal: Styles.spacing.md,
    paddingVertical: Styles.spacing.lg,
    gap: Styles.spacing.md,
  },
  filterCard: {
    gap: Styles.spacing.sm,
    borderRadius: 44,
    paddingVertical: Styles.spacing.md,
    paddingHorizontal: Styles.spacing.xl,
    position: 'relative',
  },
  filterCardMedium: {
    borderRadius: 36,
  },
  filterCardSmall: {
    borderRadius: 28,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.md,
    gap: Styles.spacing.sm,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Styles.spacing.xs,
  },
  filterHeaderSmall: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: Styles.spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  filterContentWrapper: {
    overflow: 'hidden',
  },
  filterContent: {
    gap: Styles.spacing.lg,
    paddingTop: Styles.spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Styles.spacing.lg,
  },
  filterFieldStack: {
    gap: Styles.spacing.sm,
  },
  filterField: {
    flex: 1,
    minWidth: 220,
    gap: Styles.spacing.xs,
  },
  filterRowSmall: {
    flexDirection: 'column',
    gap: Styles.spacing.sm,
  },
  filterFieldSmall: {
    minWidth: '100%',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#4D88D6',
    borderRadius: 24,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.md,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterInputPressed: {
    opacity: 0.85,
  },
  filterPlaceholder: {
    fontSize: 14,
    color: '#8EA2C0',
  },
  filterValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  filterInputIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Styles.spacing.xs,
  },
  filterMeasure: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
    left: Styles.spacing.xl,
    right: Styles.spacing.xl,
    top: Styles.spacing.md,
  },
  appointmentCard: {
    gap: Styles.spacing.md,
    borderRadius: 40,
    paddingHorizontal: Styles.spacing.xl,
    paddingVertical: Styles.spacing.lg,
    position: 'relative',
  },
  appointmentCardMedium: {
    borderRadius: 34,
  },
  appointmentCardSmall: {
    borderRadius: 26,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.md,
    gap: Styles.spacing.md,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Styles.spacing.lg,
    flexWrap: 'wrap',
  },
  appointmentHeaderSmall: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: Styles.spacing.sm,
  },
  appointmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Styles.spacing.sm,
    flexWrap: 'wrap',
  },
  appointmentActionsSmall: {
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
  },
  bulkDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Styles.spacing.xs,
    backgroundColor: '#E63A3A',
    paddingHorizontal: Styles.spacing.xl,
    paddingVertical: Styles.spacing.sm,
    borderRadius: 28,
    shadowColor: '#B92525',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  bulkDeleteButtonActive: {
    backgroundColor: '#C83333',
  },
  bulkDeleteSelectedButton: {
    backgroundColor: '#D93030',
  },
  bulkDeleteButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exportButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Styles.spacing.xs,
    marginLeft: Styles.spacing.lg,
  },
  exportButtonWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  exportIconBase: {
    width: 50,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
  },
  exportIconHover: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    shadowColor: '#0D1E3D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 9,
    transform: [{ translateY: -1 }],
  },
  exportIconPressed: {
    transform: [{ translateY: -1 }, { scale: 0.92 }],
  },
  exportIconButton: {
    width: 38,
    height: 38,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D1E3D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  exportIconButtonHovered: {
    shadowOpacity: 0.22,
    elevation: 6,
    borderColor: '#2F6FE1',
    transform: [{ translateY: -1 }],
  },
  exportIconButtonPressed: {
    transform: [{ scale: 0.92 }],
  },
  exportTooltipContainer: {
    position: 'absolute',
    bottom: '120%',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  exportTooltipShell: {
    paddingHorizontal: Styles.spacing.md,
    paddingVertical: Styles.spacing.xs,
    backgroundColor: '#0E0E0E',
    borderRadius: 7,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 9,
    elevation: 10,
  },
  exportTooltipCaret: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0E0E0E',
  },
  exportTooltipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  segmentedControl: {
    alignSelf: 'flex-start',
    marginTop: Styles.spacing.sm,
  },
  formContentWrapper: {
    overflow: 'hidden',
  },
  formContent: {
    gap: Styles.spacing.lg,
    paddingTop: Styles.spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Styles.spacing.lg,
  },
  formColumn: {
    flex: 1,
    minWidth: 280,
    gap: Styles.spacing.lg,
  },
  formField: {
    gap: Styles.spacing.xs,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  requiredMark: {
    color: '#E03B3B',
  },
  formLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineLink: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#4D88D6',
    borderRadius: 28,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.md,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formInputPressed: {
    opacity: 0.9,
  },
  formPlaceholder: {
    fontSize: 14,
    color: '#8EA2C0',
  },
  formValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  dateLabelFilled: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  dateInputContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  dateInputLabelWrapper: {
    flex: 1,
    zIndex: 2,
  },
  dateInputIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Styles.spacing.xs,
    zIndex: 2,
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  dateInputNativeFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  dateInputDisabled: {
    opacity: 0.6,
  },
  nativeDatePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 22, 51, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Styles.spacing.xl,
  },
  nativeDatePickerCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.lg,
    gap: Styles.spacing.md,
    shadowColor: '#0C1F3F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 11,
  },
  nativeDatePicker: {
    width: '100%',
  },
  nativeDatePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Styles.spacing.sm,
  },
  nativeDatePickerButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 22,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.sm,
  },
  nativeDatePickerButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nativeDatePickerButtonGhost: {
    borderRadius: 22,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.sm,
    backgroundColor: '#F3F6FB',
  },
  nativeDatePickerButtonGhostLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  slotBox: {
    borderWidth: 1,
    borderColor: '#C8D7ED',
    borderRadius: 24,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  slotPlaceholder: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F3D6E',
  },
  infoBox: {
    borderWidth: 1,
    borderColor: '#C8D7ED',
    borderRadius: 18,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.md,
    backgroundColor: '#FFFFFF',
  },
  infoPlaceholder: {
    fontSize: 14,
    color: '#8EA2C0',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Styles.spacing.sm,
  },
  formActionsMeasure: {
    height: 48,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: 24,
    paddingHorizontal: Styles.spacing.xl,
    paddingVertical: Styles.spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  cancelButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  formMeasure: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
    left: Styles.spacing.xl,
    right: Styles.spacing.xl,
    top: Styles.spacing.md,
  },
  tableContainer: {
    marginTop: Styles.spacing.md,
    gap: Styles.spacing.md,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Styles.spacing.xl,
    paddingVertical: Styles.spacing.md,
    borderRadius: 28
  },
  tableHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F3D6E',
  },
  tableHeaderPatient: {
    flex: 1.8,
  },
  tableHeaderService: {
    flex: 1.3,
  },
  tableHeaderCharges: {
    width: 120,
    textAlign: 'right',
    paddingRight: Styles.spacing.md,
  },
  tableHeaderPayment: {
    width: 150,
    paddingLeft: Styles.spacing.md,
  },
  tableHeaderStatus: {
    flex: 1,
  },
  tableHeaderAction: {
    width: 120,
    textAlign: 'right',
  },
  selectionHeaderCell: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: Styles.spacing.xl,
    paddingVertical: Styles.spacing.md,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A3358',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: Styles.spacing.sm,
  },
  selectionCell: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rowPatientColumn: {
    flex: 1.8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Styles.spacing.md,
  },
  patientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1F3D6E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  patientDetails: {
    flex: 1,
    gap: 4,
  },
  appointmentDateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F3D6E',
  },
  patientNameLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  detailText: {
    fontSize: 13,
    color: '#4B5C7A',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#1F3D6E',
  },
  rowServiceColumn: {
    flex: 1.3,
    justifyContent: 'center',
  },
  serviceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F3D6E',
  },
  rowChargesColumn: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: Styles.spacing.md,
  },
  chargeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F3D6E',
  },
  rowPaymentColumn: {
    width: 150,
    justifyContent: 'center',
    paddingLeft: Styles.spacing.md,
  },
  paymentModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F3D6E',
  },
  rowStatusColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  statusBadge: {
    borderRadius: 18,
    paddingHorizontal: Styles.spacing.md,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowActionColumn: {
    width: 90,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: Styles.spacing.xs,
  },
  // Action button styling to mirror design (paired blue buttons + red delete).
  primaryActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryActionLeft: {
    width: 36,
    height: 30,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderColor: '#2F6FE1',
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FE',
  },
  primaryActionRight: {
    width: 36,
    height: 30,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderColor: '#2F6FE1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FE',
  },
  primaryActionHover: {
    backgroundColor: '#2F6FE1',
    borderColor: '#2F6FE1',
  },
  primaryActionPressed: {
    transform: [{ scale: 0.98 }],
  },
  dangerActionButton: {
    width: 36,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E32828',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4F4',
  },
  dangerActionHover: {
    backgroundColor: '#E32828',
    borderColor: '#E32828',
  },
  dangerActionPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionButtonGroup: {
    flexDirection: 'row',
  },
  actionButtonPrimaryLeft: {
    width: 36,
    height: 30,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderColor: '#2F6FE1',
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FE',
  },
  actionButtonPrimaryRight: {
    width: 36,
    height: 30,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderColor: '#2F6FE1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FE',
  },
  actionButtonDangerStandalone: {
    width: 36,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E32828',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4F4',
  },
  actionSpacerVertical: {
    height: 2,
  },
  actionButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileInlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileActionsColumn: {
    alignItems: 'flex-start',
    gap: Styles.spacing.xs,
  },
  mobileCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: Styles.spacing.md,
    gap: Styles.spacing.md,
    shadowColor: '#102C52',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Styles.spacing.md,
  },
  selectionCellMobile: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileCardHeaderText: {
    flex: 1,
    gap: 4,
  },
  mobileInfoBlock: {
    gap: 6,
  },
  mobileDetailText: {
    fontSize: 14,
    color: '#44516B',
  },
  mobileDetailHighlight: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F3D6E',
  },
  mobileDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F3D6E',
  },
  mobileFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Styles.spacing.sm,
  },
  mobileActionsRow: {
    flexDirection: 'row',
    gap: Styles.spacing.xs,
  },
  mobileSelectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Styles.spacing.sm,
    marginHorizontal: Styles.spacing.xs,
  },
  mobileSelectAllLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F3D6E',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Styles.spacing.xl,
    paddingVertical: Styles.spacing.xxl,
    gap: Styles.spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F3D6E',
    textAlign: 'center',
  },
  statusPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 21, 46, 0.08)',
  },
  statusPickerDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  statusPickerCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C8D4E6',
    paddingVertical: 4,
    maxWidth: 320,
    shadowColor: '#0C1F3F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
    zIndex: 1000,
    overflow: 'hidden',
  },
  statusPickerCardCentered: {
    top: '30%',
    left: Styles.spacing.xl,
    right: Styles.spacing.xl,
  },
  statusPickerOption: {
    paddingVertical: Styles.spacing.md,
    paddingHorizontal: Styles.spacing.lg,
  },
  statusPickerOptionSelected: {
    backgroundColor: '#2F6FE1',
  },
  statusPickerOptionPressed: {
    backgroundColor: 'rgba(47, 111, 225, 0.12)',
  },
  statusPickerOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F3D6E',
  },
  statusPickerOptionLabelSelected: {
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 21, 46, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Styles.spacing.xl,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingHorizontal: Styles.spacing.xl,
    paddingVertical: Styles.spacing.lg,
    gap: Styles.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F3D6E',
  },
  modalBody: {
    gap: Styles.spacing.lg,
  },
  modalFieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Styles.spacing.lg,
  },
  modalField: {
    flex: 1,
    minWidth: 240,
    gap: Styles.spacing.xs,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#4D88D6',
    borderRadius: 28,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.md,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalPlaceholder: {
    fontSize: 14,
    color: '#8EA2C0',
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Styles.spacing.xs,
    backgroundColor: Colors.light.primary,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.md,
  },
  uploadButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  uploadFileName: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#4D88D6',
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.md,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  sampleLinkRow: {
    paddingVertical: Styles.spacing.xs,
    marginTop: Styles.spacing.xs,
  },
  sampleLink: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F3D6E',
  },
  modalNoteBlock: {
    gap: Styles.spacing.sm,
  },
  noteHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F3D6E',
  },
  noteList: {
    gap: 6,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Styles.spacing.xs,
  },
  noteBullet: {
    width: 7,
    height: 7,
    marginTop: 7,
    borderRadius: 3.5,
    backgroundColor: '#2A4B7C',
  },
  noteText: {
    flex: 1,
    fontSize: 15,
    color: '#495A77',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Styles.spacing.sm,
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: 24,
    paddingHorizontal: Styles.spacing.xl,
    paddingVertical: Styles.spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  modalCancelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },

  // Appointment details modal styles.
  detailsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 21, 46, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Styles.spacing.xl,
  },
  detailsModalContainer: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingHorizontal: Styles.spacing.xl,
    paddingVertical: Styles.spacing.lg,
    gap: Styles.spacing.md,
    shadowColor: '#0C1F3F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  detailsModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F3D6E',
  },
  detailsModalClose: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  detailsModalBody: {
    gap: Styles.spacing.sm,
  },
  detailRowOuter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Styles.spacing.lg,
    paddingVertical: Styles.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F4',
  },
  detailsColumn: {
    flex: 1,
    gap: 6,
  },
  detailsRowText: {
    fontSize: 14,
    color: '#1F3D6E',
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F3D6E',
  },
  detailsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F3D6E',
  },
  detailsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F4',
    marginTop: Styles.spacing.sm,
  },
  detailsFooter: {
    marginTop: Styles.spacing.sm,
    gap: Styles.spacing.xs,
  },
  detailsFooterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F3D6E',
  },
  detailsFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Styles.spacing.lg,
    marginTop: Styles.spacing.xs,
  },
  detailsFooterItem: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F3D6E',
  },
  tableContainerSmall: {
    marginTop: Styles.spacing.sm,
    gap: Styles.spacing.sm,
  },
  tableHeaderRowHidden: {
    display: 'none',
  },
  selectionCheckbox: {
    width: 15,
    height: 15,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4D88D6',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'transparent',
  },
  selectionCheckboxHeader: {
    marginRight: Styles.spacing.xs,
  },
  selectionCheckboxChecked: {
    backgroundColor: '#2F6FE1',
    borderColor: '#2F6FE1',
  },
  selectionCheckboxPressed: {
    transform: [{ scale: 0.95 }],
  },
})
const renderDetailValue = (
  label: string,
  value: string,
  highlight?: boolean,
  statusKey?: AppointmentStatus,
) => {
  const statusStyle =
    highlight && statusKey
      ? STATUS_STYLES[statusKey] ?? { background: '#2F6FE1', color: '#FFFFFF' }
      : null

  return (
    <Text style={styles.detailsRowText}>
      <Text style={styles.detailsLabel}>{label} </Text>
      <Text
        style={[
          styles.detailsValue,
          highlight && statusKey && {
            color:
              STATUS_STYLES[statusKey]?.color && STATUS_STYLES[statusKey]?.color !== '#FFFFFF'
                ? STATUS_STYLES[statusKey]!.color
                : '#2F6FE1',
          },
        ]}
      >
        {value}
      </Text>
    </Text>
  )
}







