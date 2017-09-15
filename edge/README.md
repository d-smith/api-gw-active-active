# Lambda Edge Notes

Rough idea:

* Identify primary and secondary endpoints
* Define health checks
* Use health checks to route request to healthy origin


IAM Set Up:

Trust relationship:

<pre>
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "edgelambda.amazonaws.com",
          "lambda.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
</pre>

Policy:

<pre>
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "logs:CreateLogGroup",
            "Resource": "arn:aws:logs:us-east-1:<account no>:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:us-east-1:<account no>:log-group:/aws/lambda/todosEdge:*"
            ]
        }
    ]
}
</pre>

Fun Facts:

* There does not appear to be a way to associate the lambda function via cloud formation
with the cloud front distro
* It looks like you cannot delete an edge function that has been replicated via a trigger
association with a distro.
* Environment variables are not supported for lambda edge functions
* Original implementation used request and request-promise-native for
the http calls, but just this dependency pulled in 55 libraries and 
made the zip file larger than the lamda edge limit.
* Status must be set as string, not integer
* POST body does not appear to be available in the cf context (support case pending)
