import LawyerList from "../data/lawyers_list.json";

class RollMatchService {
  constructor() {
    this.lawyersList = [];
    this.initialized = false;
  }

  // Load the lawyers list JSON file
  async loadLawyersList() {
    if (this.initialized && this.lawyersList.length > 0) {
      return this.lawyersList;
    }

    try {
      // Directly use imported JSON
      this.lawyersList = Array.isArray(LawyerList) ? LawyerList : [];
      this.initialized = true;

      console.log(`Loaded ${this.lawyersList.length} lawyers from roll list`);
      return this.lawyersList;
    } catch (error) {
      console.error("Error loading lawyers list:", error);
      this.lawyersList = [];
      this.initialized = true;
      return this.lawyersList;
    }
  }

  // Check if a roll number exists in the lawyers list
  async checkRollNumber(rollNumber) {
    if (!this.initialized) {
      await this.loadLawyersList();
    }

    if (!rollNumber || rollNumber.trim() === "") {
      return {
        matched: false,
        status: "not_found",
        reason: "No roll number provided",
      };
    }

    const normalizedRollNumber = rollNumber.toString().trim();

    const matchedLawyer = this.lawyersList.find((lawyer) => {
      const lawyerRollNo = (lawyer["Roll No."] || "").toString().trim();
      return lawyerRollNo === normalizedRollNumber;
    });

    if (matchedLawyer) {
      return {
        matched: true,
        status: "matched",
        lawyer: {
          lastname: matchedLawyer.Lastname,
          firstname: matchedLawyer.Firstname,
          middleName: matchedLawyer["Middle Name"],
          address: matchedLawyer.Address,
          rollSignDate: matchedLawyer["Roll Signed Date"],
          rollNo: matchedLawyer["Roll No."],
        },
      };
    }

    return {
      matched: false,
      status: "not_found",
      reason: "Roll number not found in PRA records",
    };
  }

  // Batch check multiple roll numbers
  async checkMultipleRollNumbers(applications) {
    if (!this.initialized) {
      await this.loadLawyersList();
    }

    return applications.map((app) => {
      const rollNumber = app.roll_number;

      if (!rollNumber || rollNumber.trim() === "") {
        return {
          ...app,
          pra_status: "not_found",
          pra_match_details: null,
        };
      }

      const normalizedRollNumber = rollNumber.toString().trim();
      const matchedLawyer = this.lawyersList.find((lawyer) => {
        const lawyerRollNo = (lawyer["Roll No."] || "").toString().trim();
        return lawyerRollNo === normalizedRollNumber;
      });

      if (matchedLawyer) {
        return {
          ...app,
          pra_status: "matched",
          pra_match_details: {
            lastname: matchedLawyer.Lastname,
            firstname: matchedLawyer.Firstname,
            middleName: matchedLawyer["Middle Name"],
            address: matchedLawyer.Address,
            rollSignDate: matchedLawyer["Roll Signed Date"],
            rollNo: matchedLawyer["Roll No."],
          },
        };
      }

      return {
        ...app,
        pra_status: "not_found",
        pra_match_details: null,
      };
    });
  }

  // Get statistics about matches
  getMatchStatistics(applications) {
    const total = applications.length;
    const matched = applications.filter(
      (a) => a.pra_status === "matched"
    ).length;
    const notFound = applications.filter(
      (a) => a.pra_status === "not_found"
    ).length;
    const noRollNumber = applications.filter(
      (a) => !a.roll_number || a.roll_number.trim() === ""
    ).length;

    return {
      total,
      matched,
      notFound,
      noRollNumber,
      matchRate: total > 0 ? ((matched / total) * 100).toFixed(1) : 0,
    };
  }
}

export default new RollMatchService();
