export default function RoutingLinks()
{
    return [
        { key: 'Encounter Templets', link: "/(tabs)/encounter-templets", iconBundle: 'FontAwsome5', iconName: 'calendar', allowedRoles: ['doctor', 'psw', 'receptionist', 'clinic_admin'] },
        {
            key: 'Patients',
            link: '/(tabs)/patients',
            iconBundle: 'Ionicons',
            iconName: 'people-sharp',
            allowedRoles: ['doctor', 'receptionist', 'clinic_admin']
        },
        { key: 'Doctors', link: '/(tabs)/doctors', iconBundle: 'FontAwsome6', iconName: 'user-doctor', allowedRoles: ['clinic_admin', 'receptionist'] },
        { key: 'PSW', link: '/(tabs)/psws', iconBundle: 'FontAwsome6', iconName: 'user-nurse', allowedRoles: ['clinic_admin', 'receptionist', 'doctor'] },
        { key: 'Services', link: '/(tabs)/services', iconBundle: 'FontAwsome6', iconName: 'briefcase-medical', allowedRoles: ['clinic_admin', 'receptionist', 'doctor'] },
        { key: 'Doctor Sessions', link: '/(tabs)/doctor-sessions', iconBundle: 'Ionicons', iconName: 'calendar', allowedRoles: ['clinic_admin', 'receptionist', 'doctor'] },
        { key: 'Billing Records', link: '/(tabs)/billing-records', iconBundle: 'FontAwsome5', iconName: 'file-invoice', allowedRoles: ['clinic_admin', 'receptionist', 'doctor', 'patient'] },
        { key: 'Reports', link: '/(tabs)/reports', iconBundle: 'FontAwsome5', iconName: 'file-contract', allowedRoles: ['patient'] },
        {
          key: 'Settings',
          submenu: [
            { key: 'Holidays', link: '/(tabs)/holidays', iconBundle: 'FontAwsome6', iconName: 'house-chimney',},
            { key: "Doctor Sessions", link: '/(tabs)/doctor-sessions', iconBundle: 'Ionicons', iconName: 'calendar' },
            { key: 'Telemed', link: '/(tabs)/telemed', iconBundle: 'FontAwsome5', iconName: 'video'},
            { key: 'Listings', link: '/(tabs)/listings', iconBundle: 'FontAwsome5', iconName: 'list-alt' },
            { key: 'Google Calendar Integration', link: '/(tabs)/google-calendar-integration', iconBundle: 'FontAwsome6', iconName: 'calendar-day'},
            { key: 'Google Meet Integration', link: '/(tabs)/google-meet-integration', iconBundle: 'FontAwsome5', iconName: 'video' },
          ],
          isVisible: false,
          iconBundle: 'Ionicons',
          iconName: 'settings',
          allowedRoles: ['clinic_admin', 'receptionist', 'doctor']
        },
        { key: 'Store', link: '/(tabs)/store', iconBundle: 'MaterialIcons', iconName: 'store', allowedRoles: ['clinic_admin', 'receptionist', 'doctor', 'patient']},
    ] 
}