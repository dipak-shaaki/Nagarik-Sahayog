# Nagarik Sahayog - Application Workflow

Here is the flow diagram representing the "Nagarik Sahayog" system workflow, connecting Citizens, Administrators, and Field Officials.

```mermaid
graph TD
    %% Roles
    subgraph Citizen [Citizen (User)]
        Start((Login)) --> SelectIssue[Select Issue Category]
        SelectIssue --> UploadData[Upload Photo & Description]
        UploadData --> GPS[Auto-Capture GPS Location]
        GPS --> Submit[Submit Report]
    end

    subgraph System [Backend System]
        Submit --> Validate{Validate Report}
        Validate -- Valid --> RouteDept[Route to Relevant Department]
        Validate -- Invalid --> Error[Return Error]
        RouteDept --> Notify received[Notify Citizen: Report Received]
    end

    subgraph Admin [Department Admin]
        RouteDept --> ViewDash[View on Admin Dashboard]
        ViewDash --> Assign[Assign Field Official]
    end

    subgraph Official [Field Official]
        Assign --> RecieveTask[Receive Task Notification]
        RecieveTask --> Navigate[Map Navigation to Location]
        Navigate --> StatusWork[Update Status: Dispatched / Working]
        StatusWork --> NotifyProgress[Notify Citizen: Dispatched + ETA]
        StatusWork --> Resolve[Resolve Issue]
        Resolve --> MarkComplete[Update Status: Completed]
    end

    subgraph Notifications [Real-time Updates]
        MarkComplete --> NotifyDone[Notify Citizen: Issue Resolved]
    end

    %% Styles
    classDef user fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef system fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef admin fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px;
    classDef staff fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;

    class Start,SelectIssue,UploadData,GPS,Submit user;
    class Validate,RouteDept,Notify received,Error system;
    class ViewDash,Assign admin;
    class RecieveTask,Navigate,StatusWork,NotifyProgress,Resolve,MarkComplete staff;
```

## Workflow Steps Description

1.  **Reporting**: Citizen logs in, selects a category (e.g., Waste, Drainage), adds details/photo, and the app automatically attaches the GPS location.
2.  **Processing**: The system validates the data and routes it to the specific department (e.g., Sanitation Dept for waste).
3.  **Assignment**: The Department Admin views the issue and assigns a Field Official.
4.  **Action**:
    *   The Field Official receives the task.
    *   They use the **Map-based Navigation** to get a route from their current location to the reported problem location.
5.  **Updates**:
    *   When the official accepts/starts moving, status updates to **Dispatched** (with ETA).
    *   When work starts, status updates to **In Progress**.
    *   When fixed, status updates to **Completed**.
6.  **Notification**: The citizen receives real-time notifications at every status change.
